/* globals _gaq, chrome, alert */
/* globals follow, followUser */
/* jshint -W106 */

window.onload = function () {

  'use strict';

  const timeout = ms => new Promise(res => setTimeout(res, ms));

  document.getElementById('startUnFollow').onclick = async function () {
    follow.isInProgress = true;

    var value = document.getElementById('ids').value;
    follow.processUsers = value.replace(/[\n\r]/g, ',').split(',');
    follow.unFollowedUsers = 0;

    for (var i = 0; i < follow.processUsers.length; i++) {
      // Random delay added to prevent bot detection
      var delayInterval = follow.delay + Math.floor(Math.random() * follow.delay / 2) + 1;
      
      if (follow.processUsers[i] != '') {
        follow.updateStatusDiv(`Mass unfollowing users: ${follow.processUsers[i]}/${i + 1} of ${follow.processUsers.length}. Delay - ${Math.floor(delayInterval / 1000)}sec`);

        var result = await followUser.unFollow(
          {
            username: follow.processUsers[i],
            userId: follow.processUsers[i],
            csrfToken: follow.csrfToken,
            updateStatusDiv: follow.updateStatusDiv,
            vueStatus: follow
          });

        if ('ok' === result) {
          follow.unFollowedUsers++;
        } else {
          console.log('Not recognized result - ' + result); // eslint-disable-line no-console
        }
        
        await timeout(follow.delay);
      }
    }

    follow.isInProgress = false;

    follow.updateStatusDiv(
      `Completed!
        UnFollowed: ${follow.unFollowedUsers}`);
  };

  document.getElementById('startFollow').onclick = async function () {

    follow.isInProgress = true;

    var value = document.getElementById('ids').value;
    follow.processUsers = value.replace(/[\n\r]/g, ',').split(',');
    follow.followedUsers = 0;
    follow.requestedUsers = 0;

    for (var i = 0; i < follow.processUsers.length; i++) {
      // Random delay added to prevent bot detection
      var delayInterval = follow.delay + Math.floor(Math.random() * follow.delay / 2) + 1;
      
      if (follow.processUsers[i] != '') {
        follow.updateStatusDiv(`Mass following users: ${follow.processUsers[i]}/${i + 1} of ${follow.processUsers.length}. Delay - ${Math.floor(delayInterval / 1000)}sec`);

        var result = await followUser.follow(
          {
            username: follow.processUsers[i],
            userId: follow.processUsers[i],
            csrfToken: follow.csrfToken,
            updateStatusDiv: follow.updateStatusDiv,
            vueStatus: follow
          });

        if ('following' === result) {
          follow.followedUsers++;
        } else if ('requested' === result) {
          follow.requestedUsers++;
        } else {
          console.log('Not recognized result - ' + result); // eslint-disable-line no-console
        }

        await timeout(delayInterval);
      }
    }

    follow.isInProgress = false;

    follow.updateStatusDiv(
      `Completed!
        Followed: ${follow.followedUsers}
        Requested: ${follow.requestedUsers}`);
  };
	
  chrome.runtime.onMessage.addListener(function (request) {
    // console.log(request);
    if (request.action === 'openMassFollowPage') {

      follow.delay = request.followDelay;
      follow.csrfToken = request.csrfToken;

      follow.viewerUserName = request.viewerUserName;
      follow.viewerUserId = request.viewerUserId;

      follow.pageSize = request.pageSizeForFeed; //is not binded
    }
  });
  
  _gaq.push(['_trackPageview']);

};

