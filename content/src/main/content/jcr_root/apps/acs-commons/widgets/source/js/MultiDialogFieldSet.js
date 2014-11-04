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

    // TODO Get rid of the console logs

    /**
     * @config {String} addItemLabel The label to display for the addItem control. Defaults to 'Add Item'.
     */

    path : '',

    bodyPadding : 4,

    fieldWidth : 0,

    constructor : function(config) {

        // TODO When this is added to a dialog, make sure you can't close that dialog, while there is an ITEM one open!
        var list = this, 
        items = [],
        defaultFieldConfig = {
            displayName : 'displayTitle',
            itemName : 'item',
            name : 'ignored',
            nodeName : './items',
            orderable : true,
            ownerCt : this,
            xtype : 'textfield'
        };

        config.orderable = true;

        config.fieldConfig = CQ.Util.applyDefaults({
            nodeName : config.name,
            itemName : config.itemName,
            displayName : config.displayPropertyName,
            dialog : config.dialog
            
        }, defaultFieldConfig);

        if (!config.addItemLabel) {
            config.addItemLabel = CQ.I18n.getMessage('Add Item');
        }

        if (config.readOnly) {
            // if component is defined as readOnly, apply this to all items
            config.fieldConfig.readOnly = true;
        } else {
            items.push({
                xtype : 'toolbar',
                cls : 'cq-multifield-toolbar',
                items : [ '->', {
                    xtype : 'textbutton',
                    text : config.addItemLabel,
                    style : 'padding-right:6px',
                    handler : function() {
                        list.addItem();
                    }
                }, {
                    xtype : 'button',
                    iconCls : 'cq-multifield-add',
                    template : new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                    handler : function() {
                        list.addItem();
                    }
                } ]
            });
        }

        this.hiddenDeleteField = new CQ.Ext.form.Hidden({
            'name' : config.name + CQ.Sling.DELETE_SUFFIX
        });
        items.push(this.hiddenDeleteField);

        config = CQ.Util.applyDefaults(config, {
            defaults : {
                xtype : 'multidialogfieldsetitem',
                fieldConfig : config.fieldConfig
            },
            items : [ {
                xtype : 'panel',
                border : false,
                bodyStyle : 'padding:' + this.bodyPadding + 'px',
                items : items
            } ]
        });

        ACS.CQ.MultiDialogFieldSet.superclass.constructor.call(this, config);

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
        'removeditem');
    },

    initComponent : function() {

        var container;
        ACS.CQ.MultiDialogFieldSet.superclass.initComponent.call(this);

        this.on('resize', function() {
            // resize fields
            var item = this.items.get(0), i = 0;
            this.calculateFieldWidth(item);
            if (this.fieldWidth > 0) {
                for (i = 0; i < this.items.length; i++) {
                    try {
                        this.items.get(i).field.setWidth(this.fieldWidth);
                    } catch (e) {
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
    afterRender : function() {
        ACS.CQ.MultiDialogFieldSet.superclass.afterRender.call(this);
        this.doLayout();
    },

    calculateFieldWidth : function(item) {
        try {
            
            // TODO fix this so it doesn't rely on the hidden field to identify that the first input should calc field size.
            var i = 0, button, w;
            this.fieldWidth = this.getSize().width - 2 * this.bodyPadding; // total row width
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
        } catch (e) {
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
    addItem : function(nodeName) {
        var itemPath,
        itemIndex = this.items.getCount() - 1, 
        item = this.insert(itemIndex, {
            indexPosition : itemIndex
        });

//        form = this.findParentByType('form');
//
//        if (form) {
//            form.getForm().add(item.field);
//        }
        this.doLayout();

        item.field.on('change', item.updateDisplayName);

        if (!nodeName) {
            nodeName = this.fieldConfig.itemName + itemIndex;
        }

        itemPath = this.path + '/' + this.name + '/' + nodeName;
        item.processPath(itemPath);

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

    processPath : function(path) {
        // TODO Don't forget to process the path on the loaded dialogs!
        // TODO This may need to be done when _creating_ the dialog, since it's not done in the constructor anymore

        this.path = path;
    },

    // processRecord : function(record, path) {
    // window.console.log(record);
    // },

    getValue : function() {
        // TODO Rewrite this based on dialogs; return the fieldName or display name for each item and that's what will
        // be used to populate the value
        var value = [];
        this.items.each(function(item, index/* , length */) {
            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                value[index] = item.getValue();
                index++;
            }
        }, this);
        return value;
    },

    setValue : function(value) {
        // TODO Rewrite this based on dialogs
        // Don't populate the form if _this_dialog, this dialog doesn't need to store the values of this item
        this.fireEvent('change', this, value, this.getValue());
        var oldItems = this.items, i = 0, prop;

        oldItems.each(function(item/* , index, length */) {
            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                this.remove(item, true);
                this.findParentByType('form').getForm().remove(item);
            }
        }, this);
        this.doLayout();
        if (typeof value === 'object') {
            for (prop in value) {
                if (value.hasOwnProperty(prop) && prop.indexOf(this.fieldConfig.itemName) === 0) {
                    // TODO Pretty sure this is wrong now
                    this.addItem(prop, value[prop]);
                }
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
ACS.CQ.MultiDialogFieldSet.Item = CQ.Ext.extend(CQ.Ext.Panel, {

    
    // TODO reduce the footprint of these things
    indexPosition : 0,

    hiddenField : undefined,

    editConfig : undefined,

    dialog : undefined,

    dialogRegistered : false,

    constructor : function(config) {
        var fieldConfig = CQ.Util.copyObject(config.fieldConfig), items = [];

        this.constructButtonConfig(items, fieldConfig);
        this.dialogConfig = this.updateDialogConfig(fieldConfig.dialog, fieldConfig.displayName);
        delete fieldConfig.dialog;

        config = CQ.Util.applyDefaults(config, {
            layout : 'table',
            anchor : '100%',
            border : false,
            layoutConfig : {
                columns : 5
            },
            defaults : {
                bodyStyle : 'padding:3px'
            },
            items : items
        });

        CQ.form.MultiField.Item.superclass.constructor.call(this, config);

        this.setIndexPosition(config.indexPosition);

    },

    constructButtonConfig : function(items, fieldConfig) {
        var item = this;
        this.field = CQ.Util.build(fieldConfig, true);
        items.push({
            xtype : 'panel',
            border : false,
            cellCls : 'cq-multifield-itemct',
            items : item.field
        });

        if (!fieldConfig.readOnly) {
            if (fieldConfig.orderable) {
                items.push({
                    xtype : 'panel',
                    border : false,
                    items : {
                        xtype : 'button',
                        iconCls : 'cq-multifield-up',
                        template : new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                        handler : function() {
                            var parent = item.ownerCt, index = parent.items.indexOf(item);
                            if (index > 0) {
                                item.reorder(parent.items.itemAt(index - 1));
                            }
                        }
                    }
                });
                items.push({
                    xtype : 'panel',
                    border : false,
                    items : {
                        xtype : 'button',
                        iconCls : 'cq-multifield-down',
                        template : new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                        handler : function() {
                            var parent = item.ownerCt, index = parent.items.indexOf(item);

                            if (index < parent.items.getCount() - 1) {
                                item.reorder(parent.items.itemAt(index + 1));
                            }
                        }
                    }
                });
            }

            items.push({
                xtype : 'panel',
                border : false,
                items : {
                    xtype : 'button',
                    iconCls : 'cq-multifield-remove',
                    template : new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                    handler : function() {
                        var parent = item.ownerCt;
                        //TODO add hidden field to delete the item
                        parent.remove(item);
                        parent.fireEvent('removeditem', parent);
                    }
                }
            });

            items.push({
                xtype : 'panel',
                border : false,
                items : {
                    xtype : 'button',
                    iconCls : 'cq-multifield-edititem',
                    template : new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                    handler : function() {
                        if (!item.field.getValue() || item.field.getValue() === '') {
                            CQ.Ext.Msg.alert(CQ.I18n.getMessage('Error'), CQ.I18n
                                    .getMessage('Please specify a name for the field before editing.'));
                            return;
                        }
                        item.showDialog();
                    }
                }
            });
        }
    },

    updateDialogConfig : function(config, hiddenFieldName) {

        var dialogConfig,
        items = [],
        self = this,
        prop;

        if (!config) {
            CQ.Log.warn('ACS.CQ.MultiDialogFieldSet#updateDialogConfig: No dialog specified.');
            return;
        }

        if (typeof config === 'string') {
            /*jslint evil: true, es5: true */
            dialogConfig = CQ.shared.HTTP.eval(config);
            dialogConfig = CQ.Util.formatData(dialogConfig);
            /*jslint evil: false, es5: false */
        } else {
            dialogConfig = config;
        }

        dialogConfig.buttons = {
            'jcr:primaryType' : 'cq:WidgetCollection',
            'ok' : {
                text : config.okText ? config.okText : CQ.I18n.getMessage('OK'),
                cls : 'cq-btn-ok',
                'handler' : function(button) {
                    self.dialogOk(button);
                }
            },
            'cancel' : CQ.Dialog.CANCEL
        };

        if (dialogConfig.items && dialogConfig.items instanceof Array) {
            items = dialogConfig.items;
        } else if (dialogConfig.items && dialogConfig.items.items instanceof Array) {
            items = dialogConfig.items.items;
        } else {
            CQ.Log.warn('ACS.CQ.MultiDialogFieldSet#updateDialogConfig: Non-standard dialog specified, no items found.');
            return;
        }

            
        items.push({
            'name' : hiddenFieldName,
            'xtype' : 'hidden'
        });
        
        return CQ.WCM.getDialogConfig(dialogConfig);
    },
    

//    constructDialog : function(config) {
//        var dialogConfig, 
//        hiddenConfig = {},
//        temp,
//        self = this;
//
//        if (typeof config === 'string') {
//            /*jslint evil: true, es5: true */
//            dialogConfig = CQ.shared.HTTP.eval(config);
//            /*jslint evil: false, es5: false */
//        } else {
//            dialogConfig = config;
//        }
//
//        // TODO move the dialog to below the input field (y attribute)
//
//        if (dialogConfig) {
//            dialogConfig.buttons = {
//                'jcr:primaryType' : 'cq:WidgetCollection',
//                'ok' : {
//                    text : config.okText ? config.okText : CQ.I18n.getMessage('OK'),
//                    cls : 'cq-btn-ok',
//                    'handler' : function(button) {
//                        self.dialogOk(button);
//                    }
//                },
//                'cancel' : CQ.Dialog.CANCEL
//            };
//
//            // Just in case the dialog isn't quite defined correctly
//            dialogConfig = CQ.WCM.getDialogConfig(dialogConfig);
//            dialogConfig.content = this.path;
//            this.dialog = CQ.WCM.getDialog(dialogConfig);
//
//            hiddenConfig[this.fieldConfig.displayName] = this.field.getValue();
//            temp = this.dialog.addHidden(hiddenConfig);
//
//            this.hiddenField = temp[this.fieldConfig.displayName];
//
//        } else {
//            CQ.Log.warn('ACS.CQ.MultiDialogFieldSet#initComponent: No dialog specified.');
//        }
//    },


    remove : function() {
        // TODO When removed; reorder and 
        this.ownerCt.remove(this, true);
    },

    /**
     * Reorders the item above the specified item.
     * 
     * @param {ACS.CQ.MultiDialogFieldSet.Item}
     *            item The item to reorder above
     * @member ACS.CQ.MultiDialogFieldSet.Item
     */
    reorder : function(item) {
        // TODO Rewrite this too reorder the items/dialogs
        if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
            var value = item.field.getValue();
            item.field.setValue(this.field.getValue());
            this.field.setValue(value);

        }
    },

    updateDisplayName : function(field, newVal, oldVal) {
        var item = this.findParentBy(function(container, textfield) {
           return container instanceof ACS.CQ.MultiDialogFieldSet.Item; 
        });

        if (item.hiddenField) {
            item.hiddenField.setValue(newVal);
        }
    },

    processPath : function(path) {
        this.path = path;
    },


    /**
     * Returns the data value.
     * 
     * @return {String} value The field value
     * @member ACS.CQ.MultiDialogFieldSet.Item
     */
    getValue : function() {
        /*
         * TODO This should return the field label? since this is only for use in the display of the managing dialog
         */
        return this.field.getValue();
    },

    /**
     * Sets a data value into the field and validates it.
     * 
     * @param {String}
     *            value The value to set
     * @member ACS.CQ.MultiDialogFieldSet.Item
     */
    setValue : function(value) {
        // TODO set the displayName, not the value of the field.
        this.field.setValue(value[this.fieldConfig.displayName]);
    },

    setIndexPosition : function(position) {
        this.indexPosition = position;
    },

    buildEditConfig : function() {

        if (this.editConfig) {
            return;
        }

        this.buildDialog();
        this.editConfig = CQ.WCM.edit({
            path : this.path,
            dialog : this.dialog,
            editConfig : {
                inlineEditing : CQ.wcm.EditBase.INLINE_MODE_NEVER
            }
        });
    },

    buildDialog : function() {
        this.dialog = CQ.Util.build(this.dialogConfig);
        this.addDisplayName(this.dialog);
    },

    addDisplayName : function(dialog) {
        
    },
    

    showDialog : function() {
        this.buildEditConfig();
        CQ.wcm.EditBase.showDialog(this.editConfig, CQ.wcm.EditBase.EDIT);
        this.dialog = this.editConfig.getEditDialog();
//        newDialog.addParams({
//            ':nameHint' : 'countryLanguage'
//        });
//        
        this.dialog.setTitle(CQ.I18n.getMessage('Edit {0} Item', this.getValue()));
        this.dialog.doLayout(false, true);

//        if (!this.dialog) {
//            this.constructDialog(this.dialogConfig);
//        }
        // TODO Add an icon for the display to show it's not the primary dialog.
//        this.dialog.setTitle(CQ.I18n.getMessage('Edit {0} Item', this.getValue()));

        // TODO Load the content!
        // this.dialog.loadContent(editConfig.path);
//        this.dialog.show();
    },

    dialogOk : function(button) {

        var mainform = this.findParentByType('form').form;

        // Trigger Validation & Events
        if (this.dialog.form && this.dialog.form.isValid()) {

            if (this.dialog.fireEvent('beforesubmit', this.dialog) === false) {
                return false;
            }
            this.dialog.form.url = this.path;
            //TODO don't check for this, rewrite it so it's registered when the dialog is created, that way you know it only happens once
            if (!this.dialogRegistered) {
                mainform.on('beforeaction', CQ.Ext.createDelegate(this.dialog.ok, this.dialog, [button]));
                this.dialogRegistered = true;
            }
            this.dialog[this.dialog.closeAction]();
        } else {
            CQ.Ext.Msg.show({
                title : CQ.I18n.getMessage('Validation Failed'),
                msg : CQ.I18n.getMessage('Verify the values of the marked fields.'),
                buttons : CQ.Ext.Msg.OK,
                icon : CQ.Ext.Msg.ERROR
            });
        }
    }

});

CQ.Ext.reg('multidialogfieldsetitem', ACS.CQ.MultiDialogFieldSet.Item);
