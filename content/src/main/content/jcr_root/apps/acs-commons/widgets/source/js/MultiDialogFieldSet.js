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
        var self = this, 
        items = [],
        defaultItemConfig = {
            displayName : 'displayTitle',
            itemName : 'item',
            nodeName : './items'
        };

        if (typeof config.orderable === 'undefined') {
            config.orderable = true;
        }

        config.itemConfig = CQ.Util.applyDefaults({
            nodeName : config.name,
            itemName : config.itemName,
            displayName : config.displayPropertyName,
            dialog : config.dialog
            
        }, defaultItemConfig);

        config.fieldConfig = {
            name : 'ignored',
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
        }

        this.hiddenDeleteField = new CQ.Ext.form.Hidden({
            'name' : config.name + CQ.Sling.DELETE_SUFFIX
        });
        items.push(this.hiddenDeleteField);

        config = CQ.Util.applyDefaults(config, {
            defaults : {
                xtype : 'acs.multidialogfieldsetitem',
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
        // TODO Add disable listener logic
        // TODO add enable listener logic

        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#initComponent end.');
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
    addItem : function(node) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet#addItem Adding item with node value \'{0}\'.', [node]);

        // This contains a panel with the "Add Item" link and button.
        var itemIndex = this.items.getCount() - 1,
        item = this.insert(itemIndex, {});

        this.doLayout();

        item.updateFieldWidth(this.calculateItemWidth());
    }
});

CQ.Ext.reg('acs.multidialogfieldset', ACS.CQ.MultiDialogFieldSet);

/**
 * @private
 * @class ACS.CQ.MultiDialogFieldSet.Item
 * @extends CQ.Ext.Panel The MultiDialogFieldSet.Item is an item in the {@link CQ.form.MultiDialogFieldSet}.
 *          This class is not intended for direct use.
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
                            window.alert('Move Up.');
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
                            window.alert('Move down.');
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
                        window.alert('Remove Item.');
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

    updateFieldWidth : function(maxWidth) {
        CQ.Log.debug('ACS.CQ.MultiDialogFieldSet.Item#updateFieldWith Max width \'{0}\' ', [maxWidth]);

        // Three to five panels, 
        // First of which is the field that needs to be resized.
        // Subtract all the buttons' sizes
        var width = 0, i = 0;
        for (i = 1; i < this.items.length; i++) {
            width += this.items.get(i).getSize().width;
        }

        this.field.setWidth(maxWidth - width);

    }
});

CQ.Ext.reg('acs.multidialogfieldsetitem', ACS.CQ.MultiDialogFieldSet.Item);
