/*
 * #%L
 * ACS AEM Commons Package
 * %%
 * Copyright (C) 2013 - 2014 Adobe
 * %%
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * #L%
 */
/*global CQ: false, ACS: false */
CQ.Ext.ns('ACS.CQ');
/**
 * @class ACS.CQ.MultiDialogFieldSeet
 * @extends CQ.form.Multifield
 *          <p>
 *          The MultiDialogFieldSet widget is a replacement for the normal multifield widget which supports multiple
 *          structures as a set of child nodes of the current component. The configuration is either a fully defined
 *          Dialog referenced by a property, or a set of children widgets.
 *          </p>
 */
ACS.CQ.MultiDialogFieldSet = CQ.Ext.extend(CQ.form.CompositeField, {

    /**
     * @cfg {String} addItemLabel The label to display for the addItem control. Defaults to 'Add Item'.
     */

    path: '',

    bodyPadding: 4,

    fieldWidth: 0,

    constructor: function(config) {
        var list = this,
            items = [];

        

        config.orderable = true;

        config.fieldConfig = {
            xtype : 'textfield',
            ownerCt : this,
            orderable : true,
            name : config.name,
            dialog : config.dialog
        };

        if (!config.addItemLabel) {
            config.addItemLabel = CQ.I18n.getMessage('Add Item');
        }

        if(config.readOnly) {
            // if component is defined as readOnly, apply this to all items
            config.fieldConfig.readOnly = true;
        } else {
            items.push({
                xtype: 'toolbar',
                cls: 'cq-multifield-toolbar',
                items: [
                    '->',
                    {
                        xtype: 'textbutton',
                        text: config.addItemLabel,
                        style: 'padding-right:6px',
                        handler:function() {
                            list.addItem();
                        }
                    },
                    {
                        xtype: 'button',
                        iconCls: 'cq-multifield-add',
                        template: new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                        handler: function() {
                            list.addItem();
                        }
                    }
                ]
            });
        }

        this.hiddenDeleteField = new CQ.Ext.form.Hidden({
            'name':config.name + CQ.Sling.DELETE_SUFFIX
        });

        items.push(this.hiddenDeleteField);

        config = CQ.Util.applyDefaults(config, {
            defaults : {
                xtype : 'multidialogfieldsetitem',
                fieldConfig : config.fieldConfig
            },
            items : [
                {
                    xtype : 'panel',
                    border : false,
                    bodyStyle : 'padding:' + this.bodyPadding + 'px',
                    items : items
                }
            ]
        });

        ACS.CQ.MultiDialogFieldSet.superclass.constructor.call(this,config);

        this.addEvents(
            /**
             * @event change Fires when the value is changed.
             * @param {CQ.form.MultiField}
             *            this
             * @param {Mixed}
             *            newValue The new value
             * @param {Mixed}
             *            oldValue The original value
             */
            'change',
            /**
             * @event removeditem Fires when an item is removed.
             * @param {CQ.form.MultiField}
             *            this
             */
            'removeditem'
        );
    },

    initComponent: function() {
        ACS.CQ.MultiDialogFieldSet.superclass.initComponent.call(this);

        this.on('resize', function() {
            // resize fields
            var item = this.items.get(0),
                i = 0;
            this.calculateFieldWidth(item);
            if (this.fieldWidth > 0) {
                for (i = 0; i < this.items.length; i++) {
                    try {
                        this.items.get(i).field.setWidth(this.fieldWidth);
                    }
                    catch (e) {
                        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#initComponent: ' + e.message);
                    }
                }
            }
        });

        this.on('disable', function() {
            this.hiddenDeleteField.disable();
            if (this.typeHintField) {
                this.typeHintField.disable();
            }
            this.items.each(function(item/* , index, length */) {
                if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                    item.field.disable();
                }
            }, this);
        });

        this.on('enable', function() {
            this.hiddenDeleteField.enable();
            if (this.typeHintField) {
                this.typeHintField.enable();
            }
            this.items.each(function(item/* , index, length */) {
                if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                    item.field.enable();
                }
            }, this);
        });
    },

    // private
    afterRender : function(){
        ACS.CQ.MultiDialogFieldSet.superclass.afterRender.call(this);
        this.doLayout();
    },

    calculateFieldWidth: function(item) {
        try {
            var i = 0, 
                button,
                w;
            this.fieldWidth = this.getSize().width - 2*this.bodyPadding; // total row width
            for (i = 0; i < item.items.length; i++) {
                button = item.items.get(i);
                // subtract each button
                if (!button.items || button.items.length <= 0 || button.items.get(0) !== item.field) {
                    w = button.getSize().width;
                    if (w === 0) {
                        // button has no size, e.g. because MV is hidden >> reset fieldWidth to avoid setWidth
                        this.fieldWidth = 0;
                        return;
                    }
                    this.fieldWidth -= item.items.get(i).getSize().width;
                }
            }
        }
        catch (e) {
            // initial resize fails if the MF is on the visible first tab
            // >> reset to 0 to avoid setWidth
            this.fieldWidth = 0;
        }
    },

    /**
     * Adds a new field with the specified value to the list.
     * 
     * @param {String}
     *            value The value of the field
     */
    addItem: function(value) {
        var item = this.insert(this.items.getCount() - 1, {}),
            form = this.findParentByType('form');

        if (form) {
            form.getForm().add(item.field);
        }
        this.doLayout();

        if (item.field.processPath) {
            item.field.processPath(this.path);
        }
        if (value) {
            item.setValue(value);
        }

        if (this.fieldWidth < 0) {
            // fieldWidth is < 0 when e.g. the MultiField is on a hidden tab page;
            // do not set width but wait for resize event triggered when the tab page is shown
            return;
        }
        if (!this.fieldWidth) {
            this.calculateFieldWidth(item);
        }
        try {
            item.field.setWidth(this.fieldWidth);
        } catch (e) {
            CQ.Log.debug('CQ.form.MultiField#addItem: ' + e.message);
        }
    },

    processPath: function(path) {
        //TODO Don't forget to process the path on the loaded dialogs!
        this.path = path;
    },

    getValue: function() {
        //TODO Rewrite this based on dialogs
        var value = [];
        this.items.each(function(item, index/* , length */) {
            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                value[index] = item.getValue();
                index++;
            }
        }, this);
        return value;
    },

    setValue: function(value) {
        //TODO Rewrite this based on dialogs
        this.fireEvent('change', this, value, this.getValue());
        var oldItems = this.items,
            i = 0;
        oldItems.each(function(item/* , index, length */) {
            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                this.remove(item, true);
                this.findParentByType('form').getForm().remove(item);
            }
        }, this);
        this.doLayout();
        if ((typeof value !== 'undefined') && (value !== null) && (value !== '')) {
            if (value instanceof Array || CQ.Ext.isArray(value)) {
                for (i = 0; i < value.length; i++) {
                    this.addItem(value[i]);
                }
            } else {
                this.addItem(value);
            }
        }
    }

});

CQ.Ext.reg('multidialogfieldset', ACS.CQ.MultiDialogFieldSet);


/**
 * @private
 * @class ACS.CQ.MultiDialogFieldSet.Item
 * @extends CQ.form.MultiField.Item The MultiDialogFieldSet.Item is an item in the {@link CQ.form.MultiDialogFieldSet}.
 *          This class is not intended for direct use.
 * @constructor Creates a new MultiDialogFieldSet.Item.
 * @param {Object}
 *            config The config object
 */
ACS.CQ.MultiDialogFieldSet.Item = CQ.Ext.extend(CQ.form.MultiField.Item, {

    dialogConfig : '',

    constructor: function(config) {
        var fieldConfig = CQ.Util.copyObject(config.fieldConfig),
            items = [];

        this.constructButtonConfig(items, fieldConfig);

        config = CQ.Util.applyDefaults(config, {
            'layout':'table',
            'anchor':'100%',
            'border':false,
            'layoutConfig':{
                'columns':5
            },
            'defaults':{
                'bodyStyle':'padding:3px'
            },
            'items':items
        });

        CQ.form.MultiField.Item.superclass.constructor.call(this, config);

        if (config.value) {
            this.field.setValue(config.value);
        }

        this.dialogConfig = fieldConfig.dialog;
        delete fieldConfig.dialog;
    },
    
    constructButtonConfig: function(items, fieldConfig) {
        var item = this;
        this.field = CQ.Util.build(fieldConfig, true);
        items.push({
            'xtype':'panel',
            'border':false,
            'cellCls':'cq-multifield-itemct',
            'items':item.field
        });

        if (!fieldConfig.readOnly) {
            if (fieldConfig.orderable) {
                items.push({
                    'xtype': 'panel',
                    'border': false,
                    'items': {
                        'xtype': 'button',
                        'iconCls': 'cq-multifield-up',
                        'template': new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                        'handler': function(){
                            var parent = item.ownerCt,
                                index = parent.items.indexOf(item);

                            if (index > 0) {
                                item.reorder(parent.items.itemAt(index - 1));
                            }
                        }
                    }
                });
                items.push({
                    'xtype': 'panel',
                    'border': false,
                    'items': {
                        'xtype': 'button',
                        'iconCls': 'cq-multifield-down',
                        'template': new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                        'handler': function(){
                            var parent = item.ownerCt,
                                index = parent.items.indexOf(item);

                            if (index < parent.items.getCount() - 1) {
                                item.reorder(parent.items.itemAt(index + 1));
                            }
                        }
                    }
                });
            }

            items.push({
                'xtype':'panel',
                'border':false,
                'items':{
                    'xtype':'button',
                    'iconCls': 'cq-multifield-remove',
                    'template': new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                    'handler':function() {
                        var parent = item.ownerCt;
                        parent.remove(item);
                        parent.fireEvent('removeditem', parent);
                    }
                }
            });

            items.push({
                'xtype':'panel',
                'border':false,
                'items': {
                    'xtype':'button',
                    'iconCls':'cq-multifield-edititem',
                    'template': new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                    'handler':function() {
                        if (!item.field.getValue() || item.field.getValue() === '') {
                            CQ.Ext.Msg.alert(CQ.I18n.getMessage('Error'), 
                                    CQ.I18n.getMessage('Please specify a name for the field before editing.'));
                            return;
                        }
                        var parent = item.ownerCt;
                        item.showDialog();
                    }
                }
            });
        }
    },

    constructDialog: function(cfg) {
        var dlgcfg, mdfs = this.ownerCt;

        if (typeof cfg === "string" ) {
            /*jslint evil: true, es5: true */
            dlgcfg = CQ.shared.HTTP.eval(cfg);
            /*jslint evil: false, es5: false*/
        } else {
            dlgcfg = cfg;
        }


        //TODO Change the title of the dialog.
        if (dlgcfg) {
            dlgcfg.title = CQ.I18n.getMessage('Edit {0} Item', this.getValue());
            dlgcfg.buttons = {
                'jcr:primaryType':'cq:WidgetCollection',
                'custom': {
                    'text': CQ.I18n.getMessage('Ok'),
                    'cls': 'cq-btn-create',
                    'handler': function() {
                        window.console.log(mdfs.title);
                        window.alert('Ok clicked!');
                    }
                },
                'cancel': CQ.Dialog.CANCEL
            };
            //Just in case the dialog isn't quite defined correctly:
            dlgcfg = CQ.WCM.getDialogConfig(dlgcfg);
            this.dialog = CQ.WCM.getDialog(dlgcfg);
        } else {
            CQ.Log.warn('ACS.CQ.MultiDialogFieldSet#initComponent: No dialog specified.');
        }
    },

    remove : function() {
        this.ownerCt.remove(this, true);
    },

    /**
     * Reorders the item above the specified item.
     * @param {ACS.CQ.MultiDialogFieldSet.Item} item The item to reorder above
     * @member ACS.CQ.MultiDialogFieldSet.Item
     */
    reorder: function(item) {
        // TODO Rewrite this too reorder the items/dialogs
        if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
            var value = item.field.getValue();
            item.field.setValue(this.field.getValue());
            this.field.setValue(value);
            
        }
    },

    /**
     * Returns the data value.
     * @return {String} value The field value
     * @member ACS.CQ.MultiDialogFieldSet.Item
     */
    getValue: function() {
        /*TODO This should return the field label? since 
            this is only for use in the display of the managing dialog
        */ 
        return this.field.getValue();
    },

    /**
     * Sets a data value into the field and validates it.
     * @param {String} value The value to set
     * @member ACS.CQ.MultiDialogFieldSet.Item
     */
    setValue: function(value) {
        //TODO set the displayName, not the value of the field.
        this.field.setValue(value);
    },

    //TODO Finish this
    showDialog: function(){
        if (!this.dialog) {
            this.constructDialog(this.dialogConfig);
        }
        // TODO Load the content!
        //this.dialog.loadContent(editConfig.path);
        this.dialog.show();
    }

});

CQ.Ext.reg('multidialogfieldsetitem', ACS.CQ.MultiDialogFieldSet.Item);
