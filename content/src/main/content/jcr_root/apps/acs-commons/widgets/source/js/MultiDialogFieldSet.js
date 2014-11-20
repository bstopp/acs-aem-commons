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

// TODO Turn this off and remove logging statements.
CQ.Log.setLevel(CQ.utils.Log.DEBUG);

/**
 * @class ACS.CQ.MultiDialogFieldSeet
 * @extends CQ.form.CompositeField
 *          <p>
 *          The MultiDialogFieldSet widget is a replacement for the normal multifield. This widget supports multiple
 *          structures as a set of child nodes of the current component. The configuration is either a fully defined
 *          Dialog referenced by a property, or a set of children widgets.
 *          </p>
 */
ACS.CQ.MultiDialogFieldSet = CQ.Ext.extend(CQ.form.CompositeField, {

    // TODO Get rid of the console logs

    /**
     * @config {String} addItemLabel The label to display for the addItem control. Defaults to 'Add Item'.
     */

    // Padding inside of the border box.
    bodyPadding : 4,

    constructor : function(config) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#constructor start.');

        // TODO When this is added to a dialog, make sure you can't close that dialog, while there is an ITEM one open!
        var self = this, items = [];

        if (typeof config.orderable === 'undefined') {
            config.orderable = true;
        }

        CQ.Util.applyDefaults(config, {
            itemNamePrefix : 'item',
            displayProperty : 'displayTitle'
        });

        config.fieldConfig = {
            orderable : config.orderable,
            ownerCt : this,
            xtype : 'textfield'
        };

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
                        self.addItem();
                    }
                }, {
                    xtype : 'button',
                    iconCls : 'cq-multifield-add',
                    template : new CQ.Ext.Template('<span><button class="x-btn" type="{0}"></button></span>'),
                    handler : function() {
                        self.addItem();
                    }
                } ]
            });
            items.push({
                xtype : 'panel',
                hidden : true,
                name : 'hiddenItemPanel'
            });
        }

        this.hiddenDeleteField = new CQ.Ext.form.Hidden({
            'name' : config.name + CQ.Sling.DELETE_SUFFIX
        });
        items.push(this.hiddenDeleteField);

        config = CQ.Util.applyDefaults(config, {
            defaults : {
                xtype : 'acs.multidialogfieldsetitem',
                itemNamePrefix : config.itemNamePrefix,
                displayProperty : config.displayProperty,
                dialog : config.dialog,
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

        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#constructor end.');

    },

    initComponent : function() {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#initComponent start.');

        ACS.CQ.MultiDialogFieldSet.superclass.initComponent.call(this);
        this.on('resize', function() {
            var innerWidth = this.calculateItemWidth();
            this.items.each(function(item) {
                if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                    item.updateFieldWidth(innerWidth);
                }
            });
        });

        this.on("disable", function() {
            this.hiddenDeleteField.disable();
            this.items.each(function(item) {
                if (item instanceof CQ.form.MultiField.Item) {
                    item.disable();
                }
            }, this);
        });

        this.on("enable", function() {
            this.hiddenDeleteField.enable();
            this.items.each(function(item) {
                if (item instanceof CQ.form.MultiField.Item) {
                    item.enable();
                }
            }, this);
        });

        this.on('afterrender', function() {
            var form = this.findParentByType('form').form;
            form.on('actioncomplete', CQ.Ext.createDelegate(this.submitItems, this));
        });

        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#initComponent end.');
    },

    processPath : function(path) {
        this.path = path;
    },

    calculateItemWidth : function() {
        return this.getSize().width - (2 * this.bodyPadding);
    },

    // TODO Do we need an afterRender method?

    /**
     * Adds a new field with the specified value to the list.
     * 
     * @param {String}
     *            node The name of the node
     */
    addItem : function(nodeName) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#addItem Adding item with node name \'{0}\'.', [ nodeName ]);

        // This contains a panel with the "Add Item" link and button.
        var prev, form, itemIndex = this.items.getCount() - 1, item = this.insert(itemIndex, {});

        if (nodeName) {
            item.processPath(this.path + '/' + this.name + '/' + nodeName);
        }
        item.loadDialog();
        this.doLayout();

        item.updateFieldWidth(this.calculateItemWidth());
    },

    setValue : function(value) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#setValue value : \'{0}\'.', [ value ]);
        var name, oldItems = this.items;

        this.fireEvent('change', this, value, this.getValue());
        oldItems.each(function(item) {
            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                this.remove(item, true);
            }
        }, this);

        this.doLayout();
        if (value && typeof value === 'object') {
            for (name in value) {
                if (name.indexOf(this.itemNamePrefix) === 0) {
                    this.addItem(name);
                }
            }
        }
    },

    submitItems : function() {
        var dialog = this.findParentByType('dialog'), 
        path = dialog.path, 
        idx, editable, firstItem, item, previousItem;

        for (idx = 0; idx < this.items.length; idx++) {
            firstItem = this.items.get(idx);
            if (firstItem instanceof ACS.CQ.MultiDialogFieldSet.Item) {
//                firstItem.updatePath(this.path + '/' + this.name + '/' + this.itemNamePrefix + '/' + idx);
                break;
            }
        }

        previousItem = firstItem;
        for (; idx < this.items.length; idx++) {
            item = this.items.get(idx);

            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
//                item.updatePath(this.path + '/' + this.name + '/' + this.itemNamePrefix + '/' + idx);
                previousItem.registerNextDialog(item);
                previousItem = item;
            }

        }

        // Last Item, refresh the component.
        editable = CQ.WCM.getEditable(dialog.path);
        previousItem.dialog.form.on('actioncomplete', editable.refreshSelf, editable);

        // Submit the chain
        firstItem.submitDialog();
        // TODO Chain the items submission;
    }

// addItemFields : function(dialog) {
//
// // TODO Man this is ugly; what's the CCN on this?
// this.items.each(function(item, idx) {
// if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
// var name, i, fieldName, fieldValue, field,
// hiddenObj = {},
// fields = item.getValue();
// for (name in fields) {
// if (name.indexOf('.') === 0 || name.indexOf('/') === 0) {
//
// for (i = 0; i < fields[name].length; i++) {
// fieldName = this.name + '/' + this.itemNamePrefix + idx + '/' + fields[name][i].name;
// fieldValue = fields[name][i].value;
// field = dialog.getField(fieldName);
// if (field) {
// if (field instanceof Array && i <= (field.length - 1)) {
// field[i].setValue(fieldValue);
// } else if (field instanceof Array){
// hiddenObj[fieldName] = fieldValue;
// }
// } else {
// hiddenObj[fieldName] = fieldValue;
// }
// CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#addItemData hidden item field \'{0}\'=\'{1}\'.', [fieldName, fieldValue]);
// }
//                        
// }
// }
// dialog.addHidden(hiddenObj);
// }
// }, this);
// }

});

CQ.Ext.reg('acs.multidialogfieldset', ACS.CQ.MultiDialogFieldSet);

/**
 * @private
 * @class ACS.CQ.MultiDialogFieldSet.Item
 * @extends CQ.Ext.Panel The MultiDialogFieldSet.Item is an item in the {@link CQ.form.MultiDialogFieldSet}. This class
 *          is not intended for direct use.
 * @constructor Creates a new MultiDialogFieldSet.Item.
 * @param {Object}
 *            config The config object
 */
ACS.CQ.MultiDialogFieldSet.Item = CQ.Ext.extend(CQ.Ext.Panel, {

    constructor : function(config) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet.Item#constructor start.');

        var fieldConfig = CQ.Util.copyObject(config.fieldConfig), items = [];

        this.constructButtonConfig(items, fieldConfig);
        this.constructDialog(config);

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

        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet.Item#constructor end.');

    },

    initComponent : function() {
        ACS.CQ.MultiDialogFieldSet.Item.superclass.initComponent.call(this);

        this.field.on('change', this.updateDisplayValue, this);
    },

    constructButtonConfig : function(items, fieldConfig) {
        var self = this;
        self.field = CQ.Util.build(fieldConfig, true);

        items.push({
            xtype : 'panel',
            border : false,
            cellCls : 'cq-multifield-itemct',
            items : self.field
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
                            var parent = self.ownerCt, idx = parent.items.indexOf(self);
                            if (idx > 0) {
                                self.reorder(parent.items.itemAt(idx - 1));
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
                            var parent = self.ownerCt, idx = parent.items.indexOf(self);
                            if (idx < parent.items.getCount() - 1) {
                                self.reorder(parent.items.itemAt(idx + 1));
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
                        // TODO Doesn't work
                        window.alert('This doesn\'t work');
                        var parent = self.ownerCt;
                        parent.remove(self);
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
                        window.alert('Open dialog.');
                    }
                }
            });
        }
    },

    constructDialog : function(config) {

        var dialogConfig, self = this, hiddenField = {
            name : './' + config.displayProperty,
            xtype : 'hidden'
        }, buttons = {
            'jcr:primaryType' : 'cq:WidgetCollection',
            'ok' : {
                text : (config.dialog && config.dialog.okText) ? config.dialog.okText : CQ.I18n.getMessage('OK'),
                cls : 'cq-btn-ok',
                'handler' : function(button) {
                    self.dialogOk();
                }
            },
            'cancel' : CQ.Dialog.CANCEL
        };

        if (!config.dialog) {
            dialogConfig = {
                xtype : 'panel',
                items : hiddenField,
                buttons : buttons
            };
        }

        this.dialogConfig = CQ.WCM.getDialogConfig(dialogConfig);
    },

    updateFieldWidth : function(maxWidth) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet.Item#updateFieldWith Max width \'{0}\' ', [ maxWidth ]);

        // Three to five panels,
        // First of which is the field that needs to be resized.
        // Subtract all the buttons' sizes
        var width = 0, i = 0;
        for (i = 1; i < this.items.length; i++) {
            width += this.items.get(i).getSize().width;
        }

        this.field.setWidth(maxWidth - width);
    },

    updateDisplayValue : function(field, newVal, oldVal) {

        var self = this, hiddenField = this.dialog.findBy(function(comp) {
            return comp.xtype === 'hidden' && comp.name.indexOf(self.displayProperty) !== -1;
        })[0];

        hiddenField.setValue(newVal);
    },

    disable : function() {
        /*
         * TODO need to disable the dialog if this is true but how to do that if i also want to disable the main dialog,
         * when we open the secondary one
         */
        this.disabled = true;
        this.field.disable();
    },

    enable : function() {
        delete this.disabled;
        this.field.enable();
    },

    processPath : function(path) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet.Item#processPath called with \'{0}\' ', [ path ]);
        this.path = path;

        var url = this.path + CQ.shared.HTTP.EXTENSION_JSON, data;

        url = CQ.shared.HTTP.addSelector(url, 'infinity');
        url = CQ.shared.HTTP.noCaching(url);

        /*jslint evil: true, es5: true */
        data = CQ.shared.HTTP.eval(url);
        /*jslint evil: false, es5: false */

        this.field.setValue(data[this.displayProperty]);
    },

    /**
     * Reorders the item above the specified item.
     * 
     * @param {CQ.form.MultiField.Item}
     *            item The item to reorder above
     * @member CQ.form.MultiField.Item
     */
    reorder : function(item) {
        var value = item.field.getValue(), dialogConfig = item.dialogConfig, path = item.path, dialog = item.dialog;

        item.field.setValue(this.field.getValue());
        item.dialogConfig = this.dialogConfig;
        item.path = this.path;
        item.dialog = this.dialog;

        this.field.setValue(value);
        this.dialogConfig = dialogConfig;
        this.path = path;
        this.dialog = dialog;
    },

    loadDialog : function() {
        this.dialog = CQ.Util.build(this.dialogConfig);
        this.dialog.loadContent(this.path);
    },

    validateDialog : function() {
        var mainform = this.findParentByType('form').form;

        // Trigger Validation & Events
        if (this.dialog.form && this.dialog.form.isValid()) {

            if (this.dialog.fireEvent('beforesubmit', this.dialog) === false) {
                return false;
            }
        } else {
            return false;
        }
    },

    updatePath : function(path) {
    },
    

    submitDialog : function(path, index) {
        this.dialog.ok();
    },

    registerNextDialog : function(next) {
        this.dialog.form.on('actioncomplete', next.submitDialog, next);
    },

    dialogOk : function() {
        window.alert('Dialog Ok!');
    }

});

CQ.Ext.reg('acs.multidialogfieldsetitem', ACS.CQ.MultiDialogFieldSet.Item);
