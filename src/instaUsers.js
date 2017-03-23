/* jshint esnext: true */
/* globals chrome */

$(function () {

	"use strict";

	var myData = [];
	var startTime;

	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		if (request.action == "modifyResultPage") {

			var fetchSettings = {
				request: null,
				userName: request.userName,
				pageSize: request.pageSize,
				delay: request.delay,
				csrfToken: request.csrfToken,
				userId: request.userId,
				relType: "All" === request.relType ? "followed_by" : request.relType,
				callBoth: "All" === request.relType,
				checkDuplicates: myData.length > 0, //probably we are starting with already opened page , TODO: what do we do about that
				follows_count: request.follows_count,
				followed_by_count: request.followed_by_count,
				follows_processed: 0,
				followed_by_processed: 0

			};
			startTime = new Date();
			prepareProgressBar(fetchSettings);
			fetchInstaUsers(fetchSettings);
		}
	});

	function prepareGrid() {
		$("#jqGrid").jqGrid({
			pager: "#jqGridPager",
			datatype: "local",
			data: myData,
			rowNum: 1000, //TODO: put it into options?
			//autowidth: false,
			width: "98%",
			shrinkToFit: true,
			height: "100%",
			rownumbers: true,
			colModel: [{
					label: 'Picture',
					name: 'profile_pic_url_hd',
					width: '320',
					align: 'center',
					sortable: false,
					formatter: function (cellvalue, model, row) {
						return `<a href='https://www.instagram.com/${row.username}' target='_blank'><img src='${cellvalue}' alt='' /></a>`;
					},
					search: false
				}, {
					label: 'Info',
					name: 'id',
					width: '200',
					sortable: false,
					formatter: function (cellvalue, model, row) {
						var ret = `id:${row.id}<br/>username:<strong>${row.username}</strong><br/>`;
						ret += row.full_name ? `full name:<strong>${row.full_name}</strong><br/>` : "";
						ret += row.connected_fb_page ? `FB:<a href='${row.connected_fb_page}' target='_blank'>${row.connected_fb_page}</a><br/>` : "";
						ret += row.external_url ? `url:<a href='${row.external_url}' target='_blank'>${row.external_url}</a>` : "";
						return ret;
					},
					cellattr: function (rowId, tv, rawObject, cm, rdata) {
						return 'style="white-space: normal;"';
					},
					search: false
				}, {
					label: 'Bio',
					name: 'biography',
					sortable: false,
					formatter: function (cellvalue, model, row) {
						return cellvalue ? `<p>${cellvalue}</p>` : "";
					},
					cellattr: function (rowId, tv, rawObject, cm, rdata) {
						return 'style="white-space: normal;"';
					},
					search: false
				}, {
					label: 'Follows<br/>you',
					name: 'follows_viewer',
					width: '80',
					formatter: 'checkbox',
					align: 'center',
					stype: 'select',
					searchoptions: {
						sopt: ["eq"],
						value: ":Any;true:Yes;false:No"
					},
					cellattr: function (rowId, tv, rawObject, cm, rdata) {
						return 'style="background-color: #fbf9ee;"';
					},
					search: true
				}, {
					label: 'Followed<br>by you',
					name: 'followed_by_viewer',
					width: '80',
					formatter: 'checkbox',
					align: 'center',
					stype: 'select',
					searchoptions: {
						sopt: ["eq"],
						value: ":Any;true:Yes;false:No"
					},
					cellattr: function (rowId, tv, rawObject, cm, rdata) {
						return 'style="background-color: #fbf9ee;"';
					},
					search: true
				}, {
					label: 'Follows<br/>user',
					name: 'user_followed_by', //relationship: followed_by - the list of the user's followers
					width: '80',
					formatter: 'checkbox',
					align: 'center',
					stype: 'select',
					searchoptions: {
						sopt: ["eq"],
						value: ":Any;true:Yes;false:No"
					},
					search: true
				}, {
					label: 'Followed<br/> by user',
					name: 'user_follows', //relationship: follows - from the list of the followed person by user
					width: '80',
					formatter: 'checkbox',
					align: 'center',
					stype: 'select',
					searchoptions: {
						sopt: ["eq"],
						value: ":Any;true:Yes;false:No"
					},
					search: true
				}, {
					label: 'Private',
					name: 'is_private',
					width: '80',
					formatter: 'checkbox',
					align: 'center',
					stype: 'select',
					searchoptions: {
						sopt: ["eq"],
						value: ":Any;true:Yes;false:No"
					},
					search: true
				}, {
					label: 'Followers',
					name: 'followed_by_count',
					width: '70',
					align: 'center',
					sorttype: 'number',
					search: true,
					searchoptions: {
						sopt: ["ge", "le", "eq"]
					}
				}, {
					label: 'Following',
					name: 'follows_count',
					width: '70',
					align: 'center',
					sorttype: 'number',
					search: true,
					searchoptions: {
						sopt: ["ge", "le", "eq"]
					}
				}, {
					label: 'Posts',
					name: 'media_count',
					width: '70',
					align: 'center',
					sorttype: 'number',
					search: true,
					searchoptions: {
						sopt: ["ge", "le", "eq"]
					}
				}, {
					name: 'username',
					hidden: true
				}, {
					name: 'id',
					hidden: true
				}, {
					name: 'full_name',
					hidden: true
				}, {
					name: 'connected_fb_page',
					hidden: true
				}, {
					name: 'external_url',
					hidden: true
				}
			],
			viewrecords: true, // show the current page, data rang and total records on the toolbar
			loadonce: true,
			caption: "Instagram Users",
		});

		$('#jqGrid').jqGrid('filterToolbar', {
			searchOperators: true
		});

		$('#jqGrid').jqGrid('navGrid', "#jqGridPager", {
			search: true, // show search button on the toolbar
			add: false,
			edit: false,
			del: false,
			refresh: true
		});

	}

	function prepareExportDiv() {

		$("body").prepend('<div id="exportCSV"><a id="linkExportCSV" href="">Export to CSV file</a></div>');

		//TODO: ALLOW TO UPDATE IT WHEN GRID IS GENERATED?
		var csvFields;
		chrome.storage.sync.get({
			csvFields : "" //TODO: Use Default
		}, (items) => { 	
			csvFields = items.csvFields;
		});		

		$("#linkExportCSV").click(function () {

			var csv = (new InstaPrepareCsv()).arrayToCsv(myData, csvFields);
			console.log("prepared data", csv);
			this.download = "export.csv";
			this.href = "data:application/csv;charset=UTF-8," + encodeURIComponent(csv); //TODO: better UTF-16?

		});
	}

	function prepareProgressBar(obj) {
		console.log("prepareProgressBar", obj.followed_by_count, obj.follows_count, obj.relType);

		if (obj.callBoth || ("followed_by" === obj.relType)) {
			$('.followed_by').show().asProgress({
				namespace: 'progress',
				min: 0,
				max: obj.followed_by_count,
				labelCallback(n) {
					const percentage = this.getPercentage(n);
					return `Followed by:${obj.followed_by_processed}/${obj.followed_by_count}/${percentage}%`;
				}
			});
		}
		if (obj.callBoth || ("follows" === obj.relType)) {
			$('.follows').show().asProgress({
				namespace: 'progress',
				min: 0,
				max: obj.follows_count,
				labelCallback(n) {
					const percentage = this.getPercentage(n);
					return `Follows:${obj.follows_processed}/${obj.follows_count}/${percentage}%`;
				}
			});
		}
	}

	function updateProgressBar(obj, count) {
		var $progressBar = $('.' + obj.relType); //TODO : cache it for performance?
		var newValue = 0 + obj[obj.relType + "_processed"] + count;
		console.log(count, newValue);
		$progressBar.asProgress("go", newValue);
		obj[obj.relType + "_processed"] = newValue;
	}
	
	function stopProgressBar(obj) {
		 $('.' + obj.relType).asProgress("finish").asProgress("stop");
	}

	function generationCompleted(obj) {
		setTimeout(function () {
			$(".followed_by").remove();
			$(".follows").remove();
		}, 3000);
		var endTime = new Date();
		var takenTime = parseInt((endTime - startTime) / 1000, 10);
		console.log(`Completed, taken time - ${takenTime}seconds, created list length - ${myData.length}, follows - ${obj.follows_count}, followed by - ${obj.followed_by_count}`);
		prepareGrid();
		prepareExportDiv();
		takenTime = parseInt((new Date() - endTime) / 1000, 10);
		console.log(`Completed grid generation, taken time - ${takenTime}seconds`);
	}

	function fetchInstaUsers(obj) {
		console.log("fetchInstaUsers is started", new Date());

		if (!obj.request) {
			obj.request = $.param({
					q: `ig_user(${obj.userId}) {${obj.relType}.first(${obj.pageSize}) {count, page_info {end_cursor, has_next_page},
			nodes {id, is_verified, followed_by_viewer, requested_by_viewer, full_name, profile_pic_url_hd, username, connected_fb_page, 
			external_url, biography, follows_viewer, is_private, follows { count }, followed_by { count }, media { count }}}}`, 
					ref: "relationships::follow_list"
				});
		}

		$.ajax({
			url: "https://www.instagram.com/query/",
			crossDomain: true,
			headers: {
				"X-Instagram-AJAX": '1',
				"X-CSRFToken": obj.csrfToken,
				"X-Requested-With": XMLHttpRequest,
				"eferer": "https://www.instagram.com/" + obj.userName + "/"
			},
			method: 'POST',
			data: obj.request,
			success: function (data, textStatus, xhr) {
				if (429 == xhr.status) {
					setTimeout(function () {
						fetchInstaUsers(obj)
					}, 180000); //TODO: Test
					alert("HTTP 429 status code is returned, request will be retried in 3 minutes");
					return;
				}
				//updateProgressBar(obj, data[obj.relType].nodes.length);
				console.log("received profiles - " + data[obj.relType].nodes.length + "," + obj.relType);
				//otherwise assume return code is 200?
				//relType could be followed_by / follows
				for (let i = 0; i < data[obj.relType].nodes.length; i++) {
					var found = false;
					if (obj.checkDuplicates) { //only when the second run happens or we started with already opened result page
						for (let j = 0; j < myData.length; j++) {
							if (data[obj.relType].nodes[i].username === myData[j].username) {
								found = true;
								console.log(`username ${myData[j].username} is found at ${i}`);
								myData[j]["user_" + obj.relType] = true;
								break;
							}
						}
					}
					if (!(found)) {
						data[obj.relType].nodes[i].followed_by_count = data[obj.relType].nodes[i].followed_by.count;
						data[obj.relType].nodes[i].follows_count = data[obj.relType].nodes[i].follows.count;
						data[obj.relType].nodes[i].media_count = data[obj.relType].nodes[i].media.count;
						data[obj.relType].nodes[i].user_follows = false; //explicitly set the value for correct search
						data[obj.relType].nodes[i].user_followed_by = false; //explicitly set the value for correct search
						data[obj.relType].nodes[i]["user_" + obj.relType] = true;
						myData.push(data[obj.relType].nodes[i]);
					}
				}
				console.log("calling update progress bar - " + data[obj.relType].nodes.length);
				updateProgressBar(obj, data[obj.relType].nodes.length);

				if (data[obj.relType].page_info.has_next_page) {
					obj.request = $.param({
							q: `ig_user(${obj.userId}) {${obj.relType}.after(${data[obj.relType].page_info.end_cursor}, ${obj.pageSize}) {count, page_info {end_cursor, has_next_page},
					nodes {id, is_verified, followed_by_viewer, requested_by_viewer, full_name, profile_pic_url_hd, username, connected_fb_page, 
					external_url, biography, follows_viewer, is_private, follows { count }, followed_by { count }, media { count }}}}`, 
							ref: "relationships::follow_list"
						});

					console.log("object delay >>>>>> - " + obj.delay, new Date());
					setTimeout(function () {
						fetchInstaUsers(obj)
					}, obj.delay);
				} else {
					stopProgressBar(obj);
					if (obj.callBoth) {
						obj.request = null;
						obj.relType = "follows";
						obj.callBoth = false;
						obj.checkDuplicates = true;
						setTimeout(function () {
							fetchInstaUsers(obj)
						}, obj.delay);
					} else {
						//we are done
						generationCompleted(obj);
					}
				}
			},
			error: function (jqXHR, exception) {
				console.log("error ajax");
				console.log(arguments);
				if (jqXHR.status === 0) {
					alert('Not connect.\n Verify Network. \n Request will be retried in 3 munutes');
					setTimeout(function () {
						fetchInstaUsers(obj)
					}, 180000); //TODO: Test
					
				} else if (jqXHR.status == 404) {
					alert('Requested page not found. [404]');
				} else if (jqXHR.status == 500) {
					alert('Internal Server Error [500].');
				} else if (exception === 'parsererror') {
					alert('Requested JSON parse failed.');
				} else if (exception === 'timeout') {
					alert('Time out error.');
				} else if (exception === 'abort') {
					alert('Ajax request aborted.');
				} else {
					alert('Uncaught Error.\n' + jqXHR.responseText);
				}
			}
		});

	}

});

window.onload = function () {
	_gaq.push(['_trackPageview']);
};
