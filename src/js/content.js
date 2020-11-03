$(() => {
	'use strict';

	const SkroutzScraper = {
		
		config: {
			skuReviewsURL: 'https://www.skroutz.gr/badge/sku_reviews?shop_code=SA-1830-0039&sku_id=',
			firefox: typeof self !== 'undefined' && typeof self.port !== 'undefined',
			timestamp: new Date().toLocaleDateString().replaceAll('/',''),
			simpleStorage: {},
			throttlingDelay: 500,
			throttlingTimer: null
		},
		
		init( settings ) {
			$.extend( SkroutzScraper.config, settings );
	 
			SkroutzScraper.setup();
		},
	 
		setup() {
			SkroutzScraper.registerEventHandlers();
		},
		
		registerEventHandlers() {
			if (SkroutzScraper.config.firefox) {
				self.port.on('history-state-updated', SkroutzScraper.processSKUs);
			} else if (typeof chrome !== 'undefined') {
				chrome.runtime.onMessage.addListener((request) => {
					if (request.type === 'history-state-updated') {
						SkroutzScraper.processSKUs();
					}
				});
			} else if (typeof safari !== 'undefined') {
				safari.self.addEventListener('message', (message) => {
					if (message.name === 'history-state-updated') {
						SkroutzScraper.processSKUs();
					}
				}, false);
			}

			$(window).on('load scroll', () => {
				SkroutzScraper.throttle(SkroutzScraper.processSKUs, SkroutzScraper.throttlingDelay);
			});
		},

		processSKUs() {
			$('li[data-skuid],li[id^="sku_"]').not('.ext__sales__visible').map((i, elem) => {
				if ($('.reviews-count', elem).length > 0 && $(elem).inView('both')) {
					let $li = $(elem),
						skuAttr = $li.attr('data-skuid'),
						sku = (typeof skuAttr == 'undefined' ? $li.prop('id').replace('sku_', '') : skuAttr),
						cacheKey = sku + '_' + SkroutzScraper.config.timestamp;

					SkroutzScraper.storage.get(cacheKey, (cached) => {
						if (cached && cached.sales) {
							SkroutzScraper.displaySales(sku, cached.sales);
						} else {
							SkroutzScraper.extractSales(sku, SkroutzScraper.displaySales);
						}
					});

					$li.addClass('ext__sales__visible');
                }
			});
		},
		
		extractSales(sku, callback) {
			$.get(SkroutzScraper.config.skuReviewsURL + sku, ( html ) => {
				let tempDom = $('<output>').append($.parseHTML(html)),
					salesText = $('.sku-reviews-sales', tempDom),
					sales = salesText.text().trim().split(' ')[0],
					cacheKey = sku + '_' + SkroutzScraper.config.timestamp;
				
				SkroutzScraper.storage.set(cacheKey, sales);
				
				callback(sku, sales);
			});
		},
		
		getSalesContainer(sku) {
			let listItem = 'li[data-skuid="' + sku + '"],li[id="sku_'+ sku +'"]',
				sales_container = $('.details', listItem);
			
			if (sales_container.length == 0) {
				sales_container = $('p.specs', listItem);

				sales_container.append('<br>')
					.addClass('ext__sales__container--noheightlimit');
			}
			else
			{
				sales_container.addClass('ext__sales__container--pushsales');
            }
			
			if(sales_container.length == 0) {
				sales_container = $('div.specs', listItem);
				
				sales_container.addClass('ext__sales__container--noheightlimit');
			}
			
			if(sales_container.length == 0) {
				sales_container = $('.rating-with-count', listItem);
				
				sales_container.append('<br>');
			}
			
			if(sales_container.length == 0)
				sales_container = $('.rating-with-count', listItem);
			
			if(sales_container.length == 0)
				sales_container = $('.extra-costs-wrapper', listItem);
				
			return sales_container;
		},
		
		displaySales(sku, sales) {
			if(sales.length > 0) {
				let sales_container = SkroutzScraper.getSalesContainer(sku);

				if(sales_container.find('.ext__sales').length == 0)
					sales_container.append('<a class="ext__sales" href="' + SkroutzScraper.config.skuReviewsURL + sku +'" target="_blank">πωλήσεις: <em>' + sales + '</em></a>');
			}
		},
	 
		storage: {
			set(key, value) {
				if ( SkroutzScraper.config.firefox ) {
					self.port.emit('update-storage', [key, value]);
				} else if ( typeof chrome !== 'undefined' ) {
					let v = {};
					v[key] = value;
					chrome.storage.local.set( v );
				} else {
					window.localStorage.setItem( key, value );
				}
			},
			get(key, cb) {
				if ( SkroutzScraper.config.firefox ) {
					self.port.emit('read-storage');
					cb( SkroutzScraper.config.simpleStorage );
				} else if ( typeof chrome !== 'undefined' ) {
					chrome.storage.local.get( key, cb );
				} else {
					cb( window.localStorage.getItem(key) );
				}
			}
		},

		throttle(callback, delay) {
			if (SkroutzScraper.throttlingTimer)
				return;

			SkroutzScraper.throttlingTimer = setTimeout(() => {
				callback();

				SkroutzScraper.throttlingTimer = undefined;
			}, delay);
        }
	};
 
	SkroutzScraper.init();
	
});