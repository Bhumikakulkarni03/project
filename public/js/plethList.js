// ------------------------------------------------------------------------
//
//
//
// ------------------------------------------------------------------------


var PlethList = {

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
		PlethList.moment = (PlethList.moment) ? false : true;
		$('#patientList').DataTable().rows().invalidate('data').draw(false);
	},


	load: function () {

		$.ajax({
			type: "GET",
			url: '../bpDataService/pleth/',
			dataType: "json",
			data: { action : "pleth" },
			
			success: function(list) {

				//
				// Build UI from response
				//
				console.log (JSON.stringify(list));

				if (PlethList.dataTable == null) {

					/* first time, set the options */
					PlethList.configDT(list);

				} else {

					/* Everytime data is refreshed, draw the table again */
					PlethList.dataTable.clear();
					PlethList.dataTable.rows.add(list);
					PlethList.dataTable.draw();
					PlethList.dataTable.columns.adjust();
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

		this.dataTable = $('#plethList').DataTable({

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
				{ "data" : "timestamp",
					render : function (datum, type, row) {
						return (this.PlethList.moment) ? moment(row.timestamp, "DD/MM/YY HH:mm").fromNow(): row.timestamp;
					},
				},
				{ "data" : "deviceId"},
				{ "data" : "patientName"},
				{ "data" : "refBP"},
				{ "data" : "spo2"},
				{ "data" : "bpm"},
				{ "data" : "pleth", "visible": false},
				{ "data" : "allIr", "visible": false},
				{ "data" : "allStatus", "visible": false},
				{ "data" : "allPi", "visible": false},
				{ "data" : "allPr", "visible": false},
				{ "data" : "allSpo2", "visible": false},
				{ "data" : "irWave", "visible": false},
				{ "data" : "plethData",

					render : function (datum, type, row) {

                        var s = `
                            <div>
                                <span class="ml-2 fas fa-chart-line text-blue" title="View Chart"
                                    onClick="showChart('${row.dataId}')">
                                </span>
                                <span class="ml-2 fas fa-th text-blue" title="View Data"
                                    onClick="showPlethData('${row.dataId}')">
                                </span>
                            </div>` ;

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
				{ "data" : "computedBPStatus"},
				{ "data" : "receivedTs",
					render : function (datum, type, row) {
						return (this.PlethList.moment) ? moment(row.receivedTs, "DD/MM/YY HH:mm").fromNow(): row.receivedTs;
					}
				}
			]
		});
	}
}

