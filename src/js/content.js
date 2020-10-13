var SKU_REVIEWS_URL = 'https://www.skroutz.gr/badge/sku_reviews?shop_code=SA-1830-0039&sku_id=';
var firefox = typeof self !== 'undefined' && typeof self.port !== 'undefined';
var today = new Date().toLocaleDateString().replaceAll('/','');
var simpleStorage = {};

var storage = {
	set: function(key, value) {
		if (firefox) {
			self.port.emit('update-storage', [key, value]);
		} else if (typeof chrome !== 'undefined') {
			var v = {};
			v[key] = value;
			chrome.storage.local.set(v);
		} else {
			window.localStorage.setItem(key, value);
		}
	},
	get: function(key, cb) {
		if (firefox) {
			self.port.emit('read-storage');
			cb(simpleStorage);
		} else if (typeof chrome !== 'undefined') {
			chrome.storage.local.get(key, cb);
		} else {
			cb(window.localStorage.getItem(key));
		}
	}
};

var showProductSales = function(sku, sales) {
	if(sales.length > 0)
	{
		var listItem = 'li[data-skuid="' + sku + '"],li[id="sku_'+ sku +'"]',
			sales_container = $('.details', listItem);
		
		if(sales_container.length == 0)
		{
			sales_container = $('p.specs', listItem);
			
			sales_container.css({'max-height': '100%', 'height': 'auto'})
						   .append('<br />');
		}
		
		if(sales_container.length == 0)
		{
			sales_container = $('div.specs', listItem);
			
			sales_container.css({'max-height': '100%', 'height': 'auto', 'display': 'block' });
		}
		
		if(sales_container.length == 0)
		{
			sales_container = $('.rating-with-count', listItem);
			
			sales_container.append('<br />');
		}
		
		if(sales_container.length == 0)
			sales_container = $('.rating-with-count', listItem);
		
		if(sales_container.length == 0)
			sales_container = $('.extra-costs-wrapper', listItem);
			
		if(sales_container.find('.ext_sales_link').length == 0)
			sales_container.append('<span class="ext_sales_link">πωλήσεις: <em>' + sales + '</em></span>');
	}
};

var scrapeProductSales = function(sku, callback) {
	$.get(SKU_REVIEWS_URL + sku, function( html ) {
		var tempDom = $('<output>').append($.parseHTML(html)),
			salesText = $('.sku-reviews-sales', tempDom),
			sales = salesText.text().trim().split(' ')[0],
			cacheKey = sku + '_' + today;
		
		storage.set(cacheKey, sales);
		
		callback(sku, sales);
	});
};

var processSKUs = function() {
	$('li[data-skuid],li[id^="sku_"]').map( function( i, elem ) {
		var $li = $(elem),
			skuAttr = $li.attr('data-skuid'),
			sku = (typeof skuAttr == 'undefined' ? $li.prop('id').replace('sku_', '') : skuAttr),
			cacheKey = sku + '_' + today;

		storage.get(cacheKey, function(cached) {
			var sales;
			
			if (cached && cached.sales) {
				showProductSales(sku, cached.sales);
			} else {
				scrapeProductSales(sku, showProductSales)
			}
		});

		return sku;
	});
};

var registerEventHandlers = function() {
	if (firefox) {
		self.port.on('history-state-updated', processSKUs);
	} else if (typeof chrome !== 'undefined') {
		chrome.runtime.onMessage.addListener(function(request) {
			if (request.type === 'history-state-updated') {
				processSKUs();
			}
		});
	} else if (typeof safari !== 'undefined') {
		safari.self.addEventListener('message', function(message) {
			if (message.name === 'history-state-updated') {
				processSKUs();
			}
		}, false);
	}
};

$(function() {
	processSKUs();
	registerEventHandlers();
});