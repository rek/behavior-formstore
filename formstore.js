'use strict';
define(['app'], function(App) {
	App.module('Common.Behaviors', function(Behaviors, App, Backbone, Marionette, $, _) {
		App.Common.Behaviors.Formstore = Marionette.Behavior.extend({

			events: {
				// most main fields get saved each key press
				'keyup textarea'              : 'saveBlock',
				'keyup input[type="text"]'    : 'saveBlock',
				'keyup input[type="number"]'  : 'saveBlock',
				'keyup input[type="email"]'   : 'saveBlock',

				'input select'                : 'saveBlock',
				'input input[type="date"]'    : 'saveBlock',
				'input input[type="time"]'    : 'saveBlock',

				// watch for clicks on radio buttons
				'click input[type="checkbox"]': 'saveBlock',
				// watch on change?
				'change input[type="radio"]'  : 'saveBlock',
			},

			supportedTypes: {
				// perhaps this would be nice:
				// text: ['text', 'textarea', 'date'],
				// radio: ['radio']

				'hidden'  : 'text',
				'select'  : 'text',
				'text'    : 'text',
				'email'   : 'text',
				'textarea': 'text',
				'date'    : 'text',
				'time'    : 'text',
				'number'  : 'text',
				'radio'   : 'radio',
				'checkbox': 'checkbox'
			},

			initialize: function() {
			    this.prefix = this.options.prefix || '';
			},

			/**
			* The way to set data on a form element
			*
			*/
			// TODO: fix this up, merge with supportedTypes somehow
			setElementValue: function(type, element, value) {
				// console.log('Setting type: ' + type);

				var self = this;
				var actions = {
					text: function(value) {
						// console.log('Getting value for: ', value);
					    element.val(value);
					},

					radio: function(value) {
						var selected = self.$el.find('input[data-key="' + element.data('key') + '"][value="' + value + '"]');

						if(selected.length === 1) {
							selected.prop('checked', true);
						}
					},

					// make sure we get with values, so if the text changes we do not automatically select it
					checkbox: function(value) {
						var selected = self.$el.find('input[data-key="' + element.data('key') + '"][value="' + value[0] + '"]');

						if(selected.length === 1) {
							selected.prop('checked', value[1]);
						}
					}
				};

				actions[type](value);
			},

			/**
			* The way to access the data we need from a form element
			*
			*/
			getElementValue: function(type, element) {
				// console.log('Getting type: ' + type);

				var actions = {
					text: function() {
						// console.log(element);
					    return element.val();
					},

					radio: function() {
						return element.val();
					},

					checkbox: function() {
						return [element.val(), element.prop('checked')];
					},
				};

				return actions[type]();
			},


			/**
			* @param element [jQuery element] - element to check for localstorage support
			*/
			setupType: function(element, set) {
				// return _.contains(['text', 'date'], element.attr('type'));
				this.processingMethod = this.supportedTypes[$(element).attr('type') || element.nodeName.toLowerCase()];

				if (!this.processingMethod) {
					// console.log('Unsupported type found', element);
					return false;
				}

				// console.log('Using processing method: ', this.processingMethod);

				if (set) {
					return _.bind(this.setElementValue, this.view, this.processingMethod, $(element));
				}

				return _.bind(this.getElementValue, this.view, this.processingMethod, $(element));
			},

			/**
			* On key up, save that input to localstorage
			*
			*/
			saveBlock: function(e) {
				var target = $(e.target),
					key = target.data('key'),
					id = this.view.model.id,
					dataGetter = this.setupType(e.target);

				if (!dataGetter || key === undefined || key === '' || target.data('noformstore') !== undefined) {
					return false; // if there is no key, no point saving
				}

				// get all block data for this section from localstorage
				var values = this._lsGet(id);
				// get the data from the specific block (dataGetter knows how)
				var newVal = dataGetter(target);
				if (newVal === '') {
					delete values[key]; // do not save empty values
				} else {
					values[key] = newVal;
				}
				// save it all back into localstorage
				this._lsSet(id, values);
			},

			_lsGet: function(id) {
				return JSON.parse(window.localStorage.getItem(this.prefix + id)) || {};
			},

			_lsSet: function(id, val) {
				window.localStorage.setItem(this.prefix + id, JSON.stringify(val));
			},

			/**
			* On render, update inputs from localstorage
			*
			*/
			onRender: function() {
				// get all items saved in localstorage for this model
				var id = this.view.model.id,
					values = this._lsGet(id);

				_.each(values, function(value, key) {
					// update value from localstorage
					var field = this.$el.find('[data-key="' + key + '"]')[0];
					// if the value from localstorage is found in this view
					if (field) {
						if ($(field).data('noformstore')) {
							// console.log('Disabled for this input');
							return;
						}
						var setter = this.setupType(field, true);
						if (setter) { // set the element with the new values
							// console.log('Setting value: ', value);
							setter(value);
						} else {
							// console.log('Unsupported type found for localstorage: ' + field);
						}
					} else { // if this element is not found anymore
						// console.log('Removing missing key: ', key);
						// cleanup removed keys
						delete values[key];
						if (_.size(values) === 0) { // if it was the last one
							// remove the whole section
							window.localStorage.removeItem(id);
						} else {
							// else, if there are keys remaining, just re-set the object
							this._lsSet(id, values);
						}
					}
				}, this);
			}
		});
	});

	return App.Common.Behaviors;
});