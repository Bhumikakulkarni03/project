
	// -----------------------------------------------------------------
	//
	// Utility method to convert hex to ASCII. Currently, DB has
	// hex values separated by spaces
	//
	// -----------------------------------------------------------------
	function hex_to_ascii(str1) {

		str1 = str1.replaceAll(' ', '');
		var hex  = str1.toString();
		var str = '';
		for (var n = 0; n < hex.length; n += 2) {
			str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
		}
		return str;
	}


	// -----------------------------------------------------------------
	//
	// Send a message to RF node
	//
	// -----------------------------------------------------------------
	function sendMessage () {

		nodeAddress = $('#recipient-node').val();
		gatewayId = $('#gatewayId').val();
		sinkId = $('#sinkId').val();
		nodeMessage = $('#message-text').val();

		$.ajax({
			type: "GET",
			url: 'nodeDataService.php',
			dataType: "json",
			data: { action : "sendmsg", nodeAddress: nodeAddress, gatewayId: gatewayId, sinkId: sinkId, nodeMessage: nodeMessage },
			
			success: function(resp) {

				$('#sendMsgForm').modal('hide');

				var status = resp.status;
				if (status == "NOT IMPLEMENTED")
					showNotImplemented();
				else
					showSuccess();
			}
		})
		.fail(function (jqXHR, textStatus, errorThrown) {
				console.log ("Error sending message to the node " + nodeAddress + "Error => " + textStatus);
				$('#sendMsgForm').modal('hide');
				showError();
		});
	}


	function showSuccess () {

		document.getElementById('alert_status').innerHTML = '  \
		<div class="alert alert-success alert-dismissible fade show" role="alert"> \
			<strong>Success: </strong>Request has been submitted. Check Audit to see if response succeeded	\
			<button type="button" class="close" data-dismiss="alert" id="alertSendStatus" aria-label="Close"> \
			<span aria-hidden="true">&times;</span> \
			</button> \
		</div>';

		setTimeout(function() {
			$(".alert").alert('close');
		}, 5000);
	}

	function showResponse (msg) {

		document.getElementById('alert_status').innerHTML = '  \
		<div class="alert alert-success alert-dismissible fade show" role="alert"> \
			<strong>Success: </strong>' + msg + '  \
			<button type="button" class="close" data-dismiss="alert" id="alertSendStatus" aria-label="Close"> \
			<span aria-hidden="true">&times;</span> \
			</button> \
		</div>';

		setTimeout(function() {
			$(".alert").alert('close');
		}, 5000);
	}

	function showErrorResponse(msg) {

		document.getElementById('alert_status').innerHTML = '\
		<div class="alert alert-danger alert-dismissible fade show" role="alert"> \
			<strong>Failed: </strong>' + msg + ' \
			<button type="button" class="close" data-dismiss="alert" id="alertSendFail" aria-label="Close"> \
			<span aria-hidden="true">&times;</span> \
			</button> \
		</div>';

		setTimeout(function() {
			$(".alert").alert('close');
		}, 5000);
	}
	
	function showError() {

		document.getElementById('alert_status').innerHTML = '\
		<div class="alert alert-danger alert-dismissible fade show" role="alert"> \
			<strong>Failed: </strong>Could not submit the request to the lock. \
			<button type="button" class="close" data-dismiss="alert" id="alertSendFail" aria-label="Close"> \
			<span aria-hidden="true">&times;</span> \
			</button> \
		</div>';

		setTimeout(function() {
			$(".alert").alert('close');
		}, 5000);
	}
	
	function showNotImplemented() {

		document.getElementById('alert_status').innerHTML = '\
		<div class="alert alert-warning alert-dismissible fade show" role="alert"> \
			<strong>Not implemented: </strong>Feature will be enabled soon. \
			<button type="button" class="close" data-dismiss="alert" id="alertSendWarn" aria-label="Close"> \
			<span aria-hidden="true">&times;</span> \
			</button> \
		</div>';

		setTimeout(function() {
			$(".alert").alert('close');
		}, 5000);
	}

	// -----------------------------------------------------------------------------------------
	//
	// Copy the JSON to Clipboard
	//
	// -----------------------------------------------------------------------------------------
	function copyText (msgId) {

		var copyText = document.getElementById(msgId);

		if(document.body.createTextRange) {

			// IE
			var range = document.body.createTextRange();
			range.moveToElementText(copyText);
			range.select();
			document.execCommand("Copy");
			alert("Message copied to clipboard");

		} else if(window.getSelection) {

			// other browsers
			var selection = window.getSelection();
			var range = document.createRange();
			range.selectNodeContents(copyText);
			selection.removeAllRanges();
			selection.addRange(range);
			document.execCommand("Copy");
			alert("Message copied to clipboard");
		}
	}

	// -----------------------------------------------------------------------------------------
	//
	// Copy the JSON to Clipboard
	//
	// -----------------------------------------------------------------------------------------
	function copyContent (content) {

		if(document.body.createTextRange) {

			// IE
			var range = document.body.createTextRange();
			range.moveToElementText(copyText);
			range.select();
			document.execCommand("Copy");
			alert("Message copied to clipboard");

		} else if(window.getSelection) {

			// other browsers
			var selection = window.getSelection();
			var range = document.createRange();
			range.selectNodeContents(copyText);
			selection.removeAllRanges();
			selection.addRange(range);
			document.execCommand("Copy");
			alert("Message copied to clipboard");
		}
	}
