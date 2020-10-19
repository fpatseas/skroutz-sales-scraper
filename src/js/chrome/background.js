chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		chrome.tabs.sendMessage(tabs[0].id, {type: 'history-state-updated'});
	});
}, {
	url: [ {hostSuffix: "skroutz.gr"} ]
});
