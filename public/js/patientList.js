// ------------------------------------------------------------------------
//
//
//
// ------------------------------------------------------------------------


var PatientList = {

	// ------------------------------------------------------------------------
	//
	// Invoke Ajax service and populate alarm DataTable
	//
	// ------------------------------------------------------------------------
	show: function () {

		this.load();
	},

	showCompact: function () {

		this.compact = true;
		this.load();
	},

	showEmpty: function() {

		list = [];
		this.configDT(list);
		this.dataTable.column(1).visible(true);
	},

	toggleTimeFormat: function() {
		PatientList.moment = (PatientList.moment) ? false : true;
		$('#patientList').DataTable().rows().invalidate('data').draw(false);
	},


	load: function () {

		$.ajax({
			type: "GET",
			url: '../bpDataService/patients/',
			dataType: "json",
			data: { action : "patients" },
			
			success: function(list) {

				//
				// Build UI from response
				//
				console.log (JSON.stringify(list));

				if (PatientList.dataTable == null) {

					/* first time, set the options */
					PatientList.configDT(list);

				} else {

					/* Everytime data is refreshed, draw the table again */
					PatientList.dataTable.clear();
					PatientList.dataTable.rows.add(list);
					PatientList.dataTable.draw();
					PatientList.dataTable.columns.adjust();
				}
			},
			error: function(error) {
				
				console.log ("Error building data table" + error);
			}
		});
	},

	// ------------------------------------------------------------------------
	//
	// Holds current Data Table in the UI. Only one instance permitted
	//
	// ------------------------------------------------------------------------
	dataTable: null,

	compact: false,

	moment: false,


	// ------------------------------------------------------------------------
	//
	// Layout defnition of DataTable for Alarms
	//
	// ------------------------------------------------------------------------
	configDT: function (list) {

		$('[data-toggle="tooltip"]').tooltip();

		this.dataTable = $('#patientList').DataTable({

			dom: '<"container-fluid"<"row"<"col"B><"col"f>>>rtip',
			buttons: [ 'excel', 'copy', 'colvis'],
			data : list,
			bStateSave  : true,
			paging      : true,
			pageLength  : 8,
			ordering    : false,
			searching   : true,
			info        : false,
			autoWidth   : false,
			columns     : [  
				{ "data" : "patientId"},
				{ "data" : "patientName"},
				{ "data" : "patientAttr"},
				{ "data" : "deviceId"}, 
				{ "data" : "refBP",
					render : function (datum, type, row) {
						s = row.refBP;
						if (row.timediff > 600) {

							if (row.timediff > 900)
								s = '';
							else
								s = `<span title='Reading expiring soon. Take another reading' class="text-gray">${row.refBP}</span>`; 
						}
						return s;
					}
				}, 
				{ "data" : "refTs",
					render : function (datum, type, row) {
						s = row.refTs;
						if (row.timediff > 600) {

							if (row.timediff > 900)
								s = '';
							else
								s = `<span title='Reading expiring soon. Take another reading' class="text-gray">${row.refTs}</span>`; 
						}
						return s;
					}
				}, 
				{ "data" : "computedBP",
					render : function (datum, type, row) {

						var s = row.computedBP;
						if (row.computedSys != null && row.computedDia != null) { 

							if (Math.abs(row.computedSys-row.refSys) > 7 ||
								Math.abs(row.computedDia-row.refDia) > 5)
							{
								s = `<span class="text-red">${row.computedBP}</span>`; 
							}
						}

						return s;
					},
				}, 
				{ "data" : "computedTs",
					render : function (datum, type, row) {
						return (this.PatientList.moment) ? moment(row.computedTs, "DD/MM/YY HH:mm").fromNow(): row.computedTs;
					},
				},
				{ "data" : "actions",

					render : function (datum, type, row) {

                        var s = `
                            <div>
                                <span class="ml-2 fas fa-link text-green" title="Link to Device"
                                    onClick="showUpdateDevice('${row.patientId}')">
                                </span>
                                <span class="ml-2 fas fa-edit text-blue" title="Update BP"
                                    onClick="showNewReading('${row.patientId}')">
                                </span>
                            </div>` ;

                        return s;
					},
				}
			]
		});
	}
}

