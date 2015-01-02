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
     * @cfg {String} addItemLabel The label to display for the addItem control. Defaults to 'Add Item'.
     */

    /**
     * @cfg {CQ.Dialog/String} dialog
     * The configuration of the dialog for the individual items. Either a fully defined dialog, or a path.
     */
    dialog : undefined,

    // Padding inside of the border box.
    bodyPadding : 4,

    constructor : function(config) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#constructor start.');

        // TODO When this is added to a dialog, make sure you can't close that dialog, while there is an ITEM one open!
        var self = this, 
        items = [];

        if (config.dialog) {
            this.dialog = config.dialog;
            delete config.dialog;
        }

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
            var form = this.findParentByType('form').form,
            dialog = this.findParentByType('dialog');
            dialog.on('beforesubmit', CQ.Ext.createDelegate(this.validateItemDialogs, this));
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
        var prev, form, item, 
        itemIndex = this.items.getCount() - 1,
        dialogCopy = this.dialog ? CQ.Util.copyObject(this.dialog) : undefined;
        
        item = this.insert(itemIndex, { dialog : dialogCopy });

        if (nodeName) {
            item.processPath(this.path + '/' + this.name + '/' + nodeName);
        }
        this.doLayout();

        item.updateFieldWidth(this.calculateItemWidth());
    },

    setValue : function(value) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#setValue value : \'{0}\'.', [ value ]);
        var name, 
        oldItems = this.items;

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
    
    validateItemDialogs : function() {
        
        var item;
        
        this.items.each(function(item) {
            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                item.loadDialog();
                if (item.validateDialog === false) {
                    return false;
                }
            }
        });
    },

    submitItems : function() {
        var dialog = this.findParentByType('dialog'), 
        path = dialog.path, 
        idx, editable, firstItem, item, previousItem;

        for (idx = 0; idx < this.items.length; idx++) {
            firstItem = this.items.get(idx);
            if (firstItem instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                firstItem.updatePath(this.path + '/' + this.name + '/' + this.itemNamePrefix + idx);
                break;
            }
        }

        idx++;
        previousItem = firstItem;
        for (; idx < this.items.length; idx++) {
            item = this.items.get(idx);

            if (item instanceof ACS.CQ.MultiDialogFieldSet.Item) {
                item.updatePath(this.path + '/' + this.name + '/' + this.itemNamePrefix + idx);
                previousItem.registerNextDialog(item);
                previousItem = item;
            }

        }

        // Last Item, refresh the component.
        editable = CQ.WCM.getEditable(dialog.path);
        previousItem.dialog.form.on('actioncomplete', editable.refreshSelf, editable);

        // Submit the chain
        firstItem.submitDialog();
    }

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

        var fieldConfig = CQ.Util.copyObject(config.fieldConfig), 
        items = [];

        this.constructButtonConfig(items, fieldConfig);

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
                        if (!self.field.getValue() || self.field.getValue() === '') {
                            CQ.Ext.Msg.alert(CQ.I18n.getMessage('Error'), CQ.I18n
                                    .getMessage('Please specify a name for the field before editing.'));
                            return;
                        }
                        
                        self.showDialog();
                    }
                }
            });
        }
    },



    updateFieldWidth : function(maxWidth) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet.Item#updateFieldWith Max width \'{0}\' ', [ maxWidth ]);

        // Three to five panels,
        // First of which is the field that needs to be resized.
        // Subtract all the buttons' sizes
        var width = 0, 
        i = 0;

        for (i = 1; i < this.items.length; i++) {
            width += this.items.get(i).getSize().width;
        }

        this.field.setWidth(maxWidth - width);
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
        var value = item.field.getValue(), 
        dialogConfig = item.dialogConfig, 
        path = item.path, 
        dialog = item.dialog;

        item.field.setValue(this.field.getValue());
        item.dialogConfig = this.dialogConfig;
        item.path = this.path;
        item.dialog = this.dialog;

        this.field.setValue(value);
        this.dialogConfig = dialogConfig;
        this.path = path;
        this.dialog = dialog;
    },

    constructDialogConfig : function(config) {

        var url, 
        dialogConfig, 
        parentDialog, 
        parentEditable,
        self,
        hiddenField,
        okConfig,
        cancelConfig;

        self = this; 

        // TODO Move this to be added after the dialog is created.
        hiddenField = {
            name : './' + this.displayProperty,
            xtype : 'hidden'
        };

        if (!config) {
            dialogConfig = {
                xtype : 'panel',
                items : [ hiddenField ]
            };
            
        } else {
            if (typeof config === 'string') {
                url = config;
                url = CQ.shared.HTTP.noCaching(url);
                /*jslint evil: true, es5: true */
                dialogConfig = CQ.shared.HTTP.eval(url);
                /*jslint evil: false, es5: false */
            } else {
                dialogConfig = config;
            }
        }    

        // This has to be copied from EditBase.getEditDialog
        // Since there is a bug in WCM.edit()
        dialogConfig = CQ.WCM.getDialogConfig(dialogConfig);
        dialogConfig.title = CQ.I18n.getMessage("Edit '{0}' Item", this.field.getValue());
        
        dialogConfig = CQ.Util.applyDefaults(dialogConfig, {
                "params" : {
                    "./jcr:lastModified" : "",
                    "./jcr:lastModifiedBy" : ""
                }
            });

        parentDialog = this.findParentByType('dialog');
        parentEditable = CQ.WCM.getEditable(parentDialog.path);

        if (parentEditable.enableLiveRelationship) {
            dialogConfig = CQ.Util.applyDefaults(dialogConfig, {
                    "editLockMode" : true,
                    "editLock" : !parentEditable[CQ.wcm.msm.MSM.PARAM_LIVE_RELATIONSHIP][CQ.wcm.msm.MSM.PARAM_STATUS][CQ.wcm.msm.MSM.PARAM_IS_CANCELLED],
                    "editLockDisabled" : !parentEditable[CQ.wcm.msm.MSM.PARAM_LIVE_RELATIONSHIP][CQ.wcm.msm.MSM.PARAM_STATUS][CQ.wcm.msm.MSM.PARAM_IS_EDITABLE],
                    "editLockDisabledTitle" : CQ.I18n.getMessage("Inheritance is broken at the page or parent level")
                });
        }

        dialogConfig.y = this.el.getY() + this.field.el.getHeight();
        this.constructButtons(dialogConfig);
        return dialogConfig;
    },

    constructButtons : function(config) {
        var 
        self = this,
        okConfig = {
            text: config.okText ? config.okText : CQ.I18n.getMessage("OK"),
            cls: "cq-btn-ok",
            handler: function(button) {
                self.dialogOk(button);
            }
        },
        cancelConfig = {
            text: config.cancelText ? config.cancelText : CQ.I18n.getMessage("Cancel"),
            cls: "cq-btn-cancel",
            handler: function(button) {
                // Cancel undo
                if (CQ.undo.UndoManager.isEnabled()) {
                    CQ.undo.UndoManager.getHistory().cancelUndo();
                }
                // scope: "this" is a dialog instance
                self.dialogCancel();
                this[this.closeAction]();
            }
        };
        
        config.buttons = [ okConfig, cancelConfig ];
    },

    loadDialog : function() {
        
        var dialogConfig,
        dialog,
        parentDialog,
        parentEditable,
        fct = function() {
            parentEditable.switchLock(dialog);
        };

        if (!this.dialog || !(this.dialog instanceof CQ.Dialog)) {
            dialogConfig = this.constructDialogConfig(this.dialog);
            dialog = CQ.WCM.getDialog(dialogConfig);
            dialog.loadContent(this.path);

            parentDialog = this.findParentByType('dialog');
            parentEditable = CQ.WCM.getEditable(parentDialog.path);

            // Copied from EditBase.showDialog()
            if (parentEditable.enableLiveRelationship) {

                dialog.on("beforeeditlocked", fct);
                dialog.on("beforeeditunlocked", fct);

                dialog.on("beforeshow", function() {
                    dialog.editLock = this.liveStatusLocked;
                }, parentEditable);
            }

            dialog.on('beforesubmit', this.updateHiddenDisplay, this);
            this.dialog = dialog;
        }
    },

    showDialog : function() {
        this.loadDialog();
        this.findParentByType('dialog').disable();
        this.dialog.show();
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
        this.path = path;
        this.dialog.path = path;
        this.dialog.setFormUrl(path);
    },

    updateHiddenDisplay : function() {
        var self = this, 
        value = this.field.getValue(),
        hiddenField = this.dialog.findBy(function(comp) {
            return comp.xtype === 'hidden' && comp.name.indexOf(self.displayProperty) !== -1;
        })[0];
        hiddenField.setValue(value);

    },

    dialogOk : function() {
        window.alert('Dialog Ok!');
    },
    
    dialogCancel : function() {
        this.findParentByType('dialog').enable();
    },

    submitDialog : function() {
        this.dialog.ok();
    },

    registerNextDialog : function(next) {
        this.dialog.form.on('actioncomplete', next.submitDialog, next);
    }

});

CQ.Ext.reg('acs.multidialogfieldsetitem', ACS.CQ.MultiDialogFieldSet.Item);
