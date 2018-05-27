/* globals alert, axios, instaDefOptions, instaMessages, instaTimeout, instaCountdown */

var followUser = function () { };

followUser.follow = function (settings) {

  'use strict';

  var {
    username, userId, csrfToken, updateStatusDiv, vueStatus
  } = settings;

  return new Promise(function (resolve, reject) {
    follow(userId, csrfToken, resolve, reject);
  });

  function successFollow(data, resolve) {
    var time = new Date();
    updateStatusDiv(`The request to follow ${username} was successful with response - ${data.result}`);
    resolve(data.result);
  }

  function retryError(message, errorNumber, resolve, reject) {
    updateStatusDiv(message, 'red');
    instaTimeout.setTimeout(3000)
      .then(function () {
        return instaCountdown.doCountdown(
          'status',
          errorNumber,
          'Following',
          +(new Date()).getTime() + instaDefOptions.retryInterval,
          vueStatus);
      })
      .then(() => {
        console.log('Continue execution after HTTP error', errorNumber, new Date()); //eslint-disable-line no-console
        follow(userId, csrfToken, resolve, reject);
      });

  }

  function errorFollow(error, resolve, reject) {
    console.log(error); //eslint-disable-line no-console
    var errorCode = error.response ? error.response.status : 0;
    if (errorCode > 0) {
      console.log(`error response data - ${JSON.stringify(error.response.data)}/${errorCode}`); //eslint-disable-line no-console
    }
    console.log(`Error making http request to follow ${username}, status - ${errorCode}`); //eslint-disable-line no-console

    if (instaDefOptions.httpErrorMap.hasOwnProperty(errorCode)) {
      console.log(`HTTP${errorCode} error trying to follow the user.`, new Date()); //eslint-disable-line no-console
      var message = instaMessages.getMessage(instaDefOptions.httpErrorMap[errorCode], errorCode, +instaDefOptions.retryInterval / 60000);
      retryError(message, errorCode, resolve, reject);
      return;
    }
    alert(instaMessages.getMessage('ERRFOLLOWUSER', username, errorCode));
    reject();
  }

  function follow(userId, csrfToken, resolve, reject) {

    var link = `https://www.instagram.com/web/friendships/${userId}/follow/`;
    var config = {
      headers: {
        'X-CSRFToken': csrfToken,
        'x-instagram-ajax': 1,
        'eferer': 'https://www.instagram.com/'
      }
    };
    axios.post(link, '', config).then(
      response => successFollow(response.data, resolve),
      error => errorFollow(error, resolve, reject)
    );
  }
};


followUser.unFollow = function (settings) {

  'use strict';

  var {
    username, userId, csrfToken, updateStatusDiv, vueStatus
  } = settings;

  return new Promise(function (resolve, reject) {
    unFollow(userId, csrfToken, resolve, reject);
  });

  function successUnFollow(data, resolve) {
    var time = new Date();
    updateStatusDiv(`The request to unfollow ${username} was successful with response - ${data.status}`);
    resolve(data.status);
  }

  function retryError(message, errorNumber, resolve, reject) {
    updateStatusDiv(message, 'red');
    instaTimeout.setTimeout(3000)
      .then(function () {
        return instaCountdown.doCountdown(
          'status',
          errorNumber,
          'Unfollowing',
          +(new Date()).getTime() + instaDefOptions.retryInterval,
          vueStatus);
      })
      .then(() => {
        console.log('Continue execution after HTTP error', errorNumber, new Date()); //eslint-disable-line no-console
        unFollow(userId, csrfToken, resolve, reject);
      });
  }

  function errorUnFollow(error, resolve, reject) {
    console.log(error); //eslint-disable-line no-console
    var errorCode = error.response ? error.response.status : 0;
    if (errorCode > 0) {
      console.log(`error response data - ${JSON.stringify(error.response.data)}/${errorCode}`); //eslint-disable-line no-console
    }
    if (400 === errorCode) {
      if (error.response && error.response.data) {
        if (('' === error.response.data.message) && ('fail' === error.response.data.status)) {
          console.log('Seems we are trying to unfollow already not existing user, we will skip it.'); //eslint-disable-line no-console
          resolve(-1);
          return;
        }
      }
    }
    console.log(`Error making http request to unfollow ${username}, status - ${errorCode}`); //eslint-disable-line no-console

    if (instaDefOptions.httpErrorMap.hasOwnProperty(errorCode)) {
      console.log(`HTTP${errorCode} error trying to follow the user.`, new Date()); //eslint-disable-line no-console
      var message = instaMessages.getMessage(instaDefOptions.httpErrorMap[errorCode], errorCode, +instaDefOptions.retryInterval / 60000);
      retryError(message, errorCode, resolve, reject);
      return;
    }
    alert(instaMessages.getMessage('ERRFOLLOWUSER', username, errorCode));
    reject();
  }

  function unFollow(userId, csrfToken, resolve, reject) {
    var link = `https://www.instagram.com/web/friendships/${userId}/unfollow/`;
    var config = {
      headers: {
        'X-CSRFToken': csrfToken,
        'x-instagram-ajax': 1,
        'eferer': 'https://www.instagram.com/' //+ obj.userName + '/'
      }
    };
    axios.post(link, '', config).then(
      response => successUnFollow(response.data, resolve),
      error => errorUnFollow(error, resolve, reject)
    );
  }
};
