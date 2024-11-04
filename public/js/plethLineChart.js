// -----------------------------------------------------------------------------------------------------
//
// (C) 2023 Hetrogenous Communication Technologies.
//
// -----------------------------------------------------------------------------------------------------

var PlethLineChart = {

	// -----------------------------------------------------------------------
	//
	// Invoke the Ajax and populate the chart
	//
	// -----------------------------------------------------------------------
	showChart: function (dataId) {

		this.loadChart(dataId);
		document.getElementById("pleth-chart-div").style.display = "block";
	},

	// -----------------------------------------------------------------------
	//
	// Hide the div containing chart element
	//
	// -----------------------------------------------------------------------
	hideChart: function () {

		/* TODO: Should the chart be destroyed? */
		document.getElementById("pleth-chart-div").style.display = "none";
	},

	//---------------------------------------------------------------------------------
	//
	// @param String chartDate	Date for which chart data will be rendered 
	//							If not specified, dooes last 24 hours.
	// @param String containerId	div for the chart
	// @param function optionsfn	Callback function to override the options.
	//								By default, method sets options for the chart
	//
	//---------------------------------------------------------------------------------
	loadChart: function (dataId, optionsfn) {

		console.log ("Selected dataId = " + dataId);


		$.ajax({
			type: "GET",
			url: '../bpDataService/plethChartData/',
			dataType: "json",
			data: { action : "plethChartData", dataId: dataId },

			
			success: function(list) {

				console.log("Data" + JSON.stringify(list));

				if (PlethLineChart.theChart == null) {

					/* Setup the data for chart */
					PlethLineChart.chartOptions.series = [];
					PlethLineChart.chartOptions.series.push({data: list});

					/* Override some options */
					options = PlethLineChart.chartOptions;
					if (optionsfn != null)
						options = optionsfn (PlethLineChart.chartOptions);

					/* Render chart with specified options */
					containerId=null;
					var divId = (containerId == null) ? 'pleth-chart-container' : containerId;

					PlethLineChart.theChart = new Highcharts.Chart(divId, options);

				} else {

					PlethLineChart.theChart.addSeries (resp);

				}
			},
			error: function(xhr, status, error) {

				handleAjaxError(xhr, status, error);
				document.getElementById('pleth-chart-error').innerHTML=
					"<p style=\"Color:white\">Failed to load Chart dataset.</p>";
			} 
		});
	},

	clearChart: function() {

		while (PlethLineChart.theChart.series.length > 0) {
			PlethLineChart.theChart.series[0].remove(false);
		}

		PlethLineChart.theChart.destroy();
		PlethLineChart.theChart = null;
		console.log ('Chart data cleaned up');
	},

	//-----------------------------------------------------------------------------
	//
	// Method renders smaller version of chart without overlay. 
	// Internal method. Don't invoke directly.
	//
	//-----------------------------------------------------------------------------
	renderStandaloneChart: function (rangeStart, rangeEnd, containerId) {

		this.loadChart (rangeStart, rangeEnd, containerId, this.setStandaloneOptions);
	},

	//-----------------------------------------------------------------------------
	//
	// Override method to set Chart Options for mini chart. Returns the updated
	// object to loadChart
	//
	// @param String options HighChart options that need to be updated.
	//
	//-----------------------------------------------------------------------------
	setStandaloneOptions: function (options) {

		console.log ("Doing override ");
		options.chart.height = 150;	
		options.chart.width = 300;	
		options.title.text = '';
		options.subtitle.text = '';
		options.legend.enabled = false;

		return options;
	},


	theChart: null,

	//-----------------------------------------------------------------------------
	//
	// CHART LAYOUT
	//
	//-----------------------------------------------------------------------------
	chartOptions : {


		chart: { 
			type: 'line',
			backgroundColor: '#454d55',
			zoomType: 'x'
		},
        title: {
            text: 'Pleth Wave'
        },
		colors: ['#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066',
            '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee' ],
		time: {
			useUTC: false,
		},
		xAxis: {
			zoomEnabled: true,
			title: {
				text: 'Timeline'
			}
		},
		yAxis: {
			title: {
				text: 'Value'
			}
		},
		plotOptions: {
			series: { }
		},
		exporting: {
			enabled:true
		},
		navigation: {
			buttonOptions: {
				enabled: true
			}
		},
        series: []
    }
}
