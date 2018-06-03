/* globals Vue, chrome, _gaq, instaDefOptions, instaLike, GetPosts */

const timeout = ms => new Promise(res => setTimeout(res, ms));

var liker = new Vue({ // eslint-disable-line no-unused-vars
  el: '#app',
  created() {
    console.log('liker created...'); // eslint-disable-line no-console
    this.viewerUserId = '';
    this.viewerUserName = '';
    this.csrfToken = '';
    this.startDate = null; // timestamp when process was started
  },
  mounted: () => {
    console.log('liker mounted...'); // eslint-disable-line no-console
    _gaq.push(['_trackPageview']);

    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'openLikerPage') {
        liker.csrfToken = request.csrfToken;
        liker.delay = request.likeDelay;
        liker.viewerUserName = request.viewerUserName;
        liker.viewerUserId = request.viewerUserId;
        liker.pageSize = request.pageSizeForFeed;
        liker.userToLike = request.userName === instaDefOptions.you ? request.viewerUserName : request.userName;
      }
    });
  },
  data: {
    isInProgress: false, //indicate if liking is in progress

    amountToLike: 5, //how many should be liked
    stopCriterion: 'amountPosts', //stop criterion assigned to radio button
    delay: 0, //interval between sending the http requests

    liked: 0, //how many liked during execution
    alreadyLiked: 0, //how many found already liked
    skippedSuggestedUsers: 0,
    skippedVideo: 0,
    skippedOwnPosts: 0,
    skippedTooFewLike: 0,

    restarted: 0, //how many times the getting feed was restarted
    fetched: 0, //how may posts were fetched

    stop: false, //if user requested the proceess to be stopped by clicking the button

    status: '', //the message displayed in status div
    statusColor: '',
    log: '', //the text displayed in text are

    whatToLike: 'likeProfile', //radiobutton - like your feed or posts of another user (likeFeed or likeProfile)
    userToLike: '',
    allPostsFetched: false, // when all posts from user's profile are fetched

    skipVideo: false, // do not like video
    skipOwnPosts: true, // do not like your own posts
    minLike: 0, // like a post when already amount of likes >=

    ids: '', // ???
    bucketsize: 100,
    bucketdelay: 1800000
  },
  computed: {
    isCompleted: function () {
      if (this.stop) {
        this.updateStatusDiv(`${new Date().toLocaleString()}/The process is stopped now because you clicked the Stop button`);
        return true;
      } else if ((this.stopCriterion === 'alreadyLiked') && (this.alreadyLiked > 0)) {
        this.updateStatusDiv(`${new Date().toLocaleString()}/The process is stopped because already liked posts are found - ${this.alreadyLiked}`);
        return true;
      } else if ((this.stopCriterion === 'amountPosts') && (this.amountToLike <= this.liked)) {
        this.updateStatusDiv(`${new Date().toLocaleString()}/The process is stopped because ${this.liked} posts were liked`);
        return true;
      } else if ((this.whatToLike === 'likeProfile') && (this.allPostsFetched)) {
        this.updateStatusDiv(`${new Date().toLocaleString()}/The process is stopped because no more posts in the user's profile`);
        return true;
      }
      return false;
    },
    startButtonDisabled: function () {
      return this.isInProgress ||  //process is not running
        (('likeProfile' === this.whatToLike) && ('' === this.userToLike)); //profile is specified when profile should be liked
    }
  },
  methods: {
    updateStatusDiv: function (message, color) {
      this.log += message + '\n';
      this.status = message;
      this.statusColor = color || 'black';
      setTimeout(function () {
        var textarea = document.getElementById('log_text_area');
        textarea.scrollTop = textarea.scrollHeight;
      }, 0);
    },
    validateUserProfile: function (e) {
      // todo : implement validateUserProfile
      // e.target.select();
    },
    getPosts: function (instaPosts, restart) {
      instaPosts.getPosts(restart).then(media => {

        this.fetched += media.length;
        this.likeMedia(instaPosts, media, 0);

      }).catch(e => {
        this.updateStatusDiv(e.toString());
      });
    },
    toLike: function (obj) {
      var url = obj.node.display_url;
      var taken = new Date(obj.node.taken_at_timestamp * 1000).toLocaleString();
      var userName = 'likeProfile' === this.whatToLike ? this.userToLike : obj.node.owner.username;
      var likesCount = obj.node.edge_media_preview_like.count;
      this.updateStatusDiv(`${obj.node.is_video === true ? 'Video' : 'Post'} ${url} taken on ${taken} by ${userName} has ${likesCount} likes`);
      if (!obj.node.owner) {
        this.skippedSuggestedUsers++;
        this.updateStatusDiv('...Post skipped as there are no owner, maybe suggested users...');
        // "__typename": "GraphSuggestedUserFeedUnit",
        return false;
      }
      if (obj.node.is_video && obj.node.is_video === this.skipVideo) {
        this.skippedVideo++;
        this.updateStatusDiv('...Post skipped as it is video and video should be skipped...');
        return false;
      }
      if (userName === this.viewerUserName) {
        this.skippedOwnPosts++;
        this.updateStatusDiv('...Post skipped as it is your post and you own posts should be skipped...');
        return false;
      }
      if (this.minLike > likesCount) {
        this.skippedTooFewLike++;
        this.updateStatusDiv(`...Post skipped as it has only ${likesCount} likes, and min allowed ${this.minLike}...`);
        return false;
      }
      return true;
    },
    scheduleNextRun: function(instaPosts, media, index, delay) {
      var delayInterval = delay + Math.floor(Math.random() * delay * 0.3) + 1;

      if (this.isCompleted) {
        this.updateStatusDiv(`Started at ${this.startDate}`);
        this.updateStatusDiv(`Liked ${this.liked} posts`);
        this.updateStatusDiv(`Found already liked ${this.alreadyLiked} posts`);
        this.updateStatusDiv(`Skipped: Suggested Users ${this.skippedSuggestedUsers} posts`);
        this.updateStatusDiv(`Skipped: Video ${this.skippedVideo} posts`);
        this.updateStatusDiv(`Skipped: Own Posts ${this.skippedOwnPosts} posts`);
        this.updateStatusDiv(`Skipped: No enough likes - ${this.skippedTooFewLike} posts`);
        this.updateStatusDiv(`Fetched ${this.fetched} posts`);
        this.updateStatusDiv(`Fetching feed restarted ${this.restarted} times`);
        this.updateStatusDiv(`Completed at ${new Date().toLocaleTimeString()}`);
        this.isInProgress = false;
        return;
      } else {
        this.updateStatusDiv(`Delay interval for ${delayInterval}ms`);
        setTimeout(() => liker.likeMedia(instaPosts, media, index), delayInterval);
      }
    },
    likeMedia: function (instaPosts, media, index) {

      var i = media.length;
      if (i > index) { //we still have something to like
        var obj = media[index];
        var id = obj.node.id;
        if (this.toLike(obj)) {
          instaPosts.isNotLiked(obj).then(result => {
            if (result) { //not yet liked
              instaLike.like({ mediaId: id, csrfToken: this.csrfToken, updateStatusDiv: this.updateStatusDiv, vueStatus: liker }).then(
                function (result) {
                  if (result) { //liked
                    liker.updateStatusDiv(`...liked post ${++liker.liked} on ${new Date().toLocaleString()}`);
                  } else { //missing media error
                    //TODO: indicate at the end of processing how many "missing media" errors
                    liker.updateStatusDiv('...missing media, proceeding to the next post!');
                  }
                  liker.scheduleNextRun (instaPosts, media, ++index, liker.delay);
                });
            } else {
              this.updateStatusDiv('...and it is already liked by you!');
              this.alreadyLiked += 1;
              this.scheduleNextRun (instaPosts, media, ++index, 0);
            }
          });
        } else {
          this.scheduleNextRun (instaPosts, media, ++index, 0); // no need to like
        }
      } else if (instaPosts.hasMore()) { //do we still have something to fetch
        this.updateStatusDiv(`The more posts will be fetched now...${new Date()}`);
        setTimeout(() => this.getPosts(instaPosts, false), this.delay);
      } else if ('likeFeed' === this.whatToLike) { // nothing more in feed > restart
        this.updateStatusDiv(`IG has returned no more posts, restart ...${new Date()}`);
        this.restarted++;
        setTimeout(() => this.getPosts(instaPosts, true), this.delay);
      } else { // nothing more found in profile >> no restart
        this.allPostsFetched = true;
        this.scheduleNextRun (instaPosts, media, ++index, 0);
      }
    },
    startButtonClick: async function () {
      var usersValues = document.getElementById('userToLike').value,
          usersList = usersValues.replace(/[\n\r]/g, ',').split(','),
          bucketSize = document.getElementById('bucketsize').value,
          bucketDelay = parseInt(document.getElementById('bucketdelay').value);

      var message = {
        'alreadyLiked': 'It will be stopped when already liked post is met',
        'amountPosts': `It will be stopped when ${this.amountToLike} posts will be liked.`
      };

      for (var i = 0; i < usersList.length; i ++) {
        var likerTiming = this.amountToLike * liker.delay,
            usersTimeout = likerTiming + Math.floor(Math.random() * likerTiming * 0.60) + 1;

        var userNumber = i + 1,
            bucketLimitReached = false;

        console.log(userNumber);
        console.log(bucketSize);
        console.log(bucketDelay);

        if (userNumber % bucketSize === 0) {
          bucketLimitReached = true;
          usersTimeout = usersTimeout + bucketDelay;
        }

        var instaPosts =
          new GetPosts({
            pageSize: this.pageSize,
            mode: this.whatToLike,
            updateStatusDiv: this.updateStatusDiv,
            end_cursor: null,
            vueStatus: this,
            userName: usersList[i],
            userId: this.viewerUserName === this.userToLike ? this.viewerUserId : ''
          });

        instaPosts.resolveUserName().then(() => {

          liker.liked = 0;
          liker.alreadyLiked = 0;
          liker.skippedSuggestedUsers = 0;
          liker.skippedVideo = 0;
          liker.skippedOwnPosts = 0;
          liker.skippedTooFewLike = 0;

          liker.restarted = 0;
          liker.fetched = 0;
          liker.startDate = (new Date()).toLocaleTimeString();
          liker.stop = false;
          liker.log = '';
          liker.allPostsFetched = false;

          liker.isInProgress = true;

          liker.updateStatusDiv(message[liker.stopCriterion]);

          if (bucketLimitReached) {
            liker.updateStatusDiv(`*** Bucket limit reached. Timeout - ${Math.floor(usersTimeout / 1000)}sec ***`);
          }
          liker.updateStatusDiv(`Users processed - ${userNumber - 1} / ${usersList.length}`)
          liker.updateStatusDiv('You can change the stop criteria during running the process');

          liker.getPosts(instaPosts, true);

        }, () => {
          alert('Specified user was not found');
          instaPosts = null;
        });
        await timeout(usersTimeout);
      }
    }
  }
});
