var params = {
	CLIENT_ID: '****.apps.googleusercontent.com',
	CLIENT_SECRET: '',
	BUCKET_NAME: '',
	FILE_PATH: '/'
};

/**
 * uploadAttachmentToGCS - Uploads the attachment to GCS
 */
function uploadAttachmentToGCS(attachment, service) {
	var blob = attachment.copyBlob();
	var bytes = blob.getBytes();

	var url = 'https://www.googleapis.com/upload/storage/v1/b/BUCKET/o?uploadType=media&name=FILE'
		.replace("BUCKET", params.BUCKET_NAME)
		.replace("FILE", encodeURIComponent(params.FILE_PATH + attachment.getName()));

	var response = UrlFetchApp.fetch(url, {
		method: "POST",
		contentLength: bytes.length,
		contentType: attachment.getContentType(),
		payload: bytes,
		headers: {
			Authorization: 'Bearer ' + service.getAccessToken()
		}
	});

	var result = JSON.parse(response.getContentText());
	Logger.log(JSON.stringify(result, null, 2));
}

/**
 * getService - Checks for authentication with client and secret ID
 */
function getService() {
	return OAuth2.createService('ctrlq')
		.setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
		.setTokenUrl('https://accounts.google.com/o/oauth2/token')
		.setClientId(params.CLIENT_ID)
		.setClientSecret(params.CLIENT_SECRET)
		.setCallbackFunction('authCallback')
		.setPropertyStore(PropertiesService.getUserProperties())
		.setScope('https://www.googleapis.com/auth/devstorage.read_write')
		.setParam('access_type', 'offline')
		.setParam('approval_prompt', 'force')
		.setParam('login_hint', Session.getActiveUser().getEmail());
}


function authCallback(request) {
	var service = getService();
	var authorized = service.handleCallback(request);
	if (authorized) {
		return HtmlService.createHtmlOutput('Connected to Google Cloud Storage');
	} else {
		return HtmlService.createHtmlOutput('Access Denied');
	}
}

/**
 * Processes a message
 */
function processMessage(message, service) {
	Logger.log("INFO: Processing message: "+message.getSubject() + " (" + message.getId() + ")");
	var attachments = message.getAttachments();
	var attachment = attachments[0];
	uploadAttachmentToGCS(attachment, service);
	Logger.log("INFO: Processing attachment: "+attachment.getName());
}

/**
 * Main function that processes Gmail attachments and stores them in GCS.
 * Use this as trigger function for periodic execution.
 */
function Gmail2GCS() {
	if (!GmailApp) return; // Skip script execution if GMail is currently not available
	var service = getService();

	if (!service.hasAccess()) {
		Logger.log("Please authorize %s", service.getAuthorizationUrl());
		return;
	}

	var end, start;
	start = new Date(); // Start timer

	Logger.log("INFO: Starting mail attachment processing.");

	var config = getConfig();

	// Process all threads matching the search expression:
	var threads = GmailApp.search(config.filter);
	Logger.log("INFO: Processing rule: "+ config.filter);

	var messages = threads[0].getMessages();
	var message = messages[messages.length - 1];
	
	processMessage(message, service);

	end = new Date(); // Stop timer
	var runTime = (end.getTime() - start.getTime())/1000;
	Logger.log("INFO: Finished mail attachment processing after " + runTime + "s");
}