/* globals Vue */

var follow = new Vue({ // eslint-disable-line no-unused-vars
  el: '#app',
  created() {
    this.viewerUserId = '';
    this.viewerUserName = '';

    this.startDate = null; //timestamp when process was started
  },
  data: {
    isInProgress: false,

    delay: 0, //interval between sending the http requests

    stop: false, //if user requested the proceess to be stopped by clicking the button

    status: '', //the message displayed in status div
    statusColor: '',

    log: '', //the text displayed in log area
    ids: '',
    bucketsize: '',
    bucketdelay: ''

  },
  computed: {
    startButtonDisabled: function () {
      return this.isInProgress
    },
    binding() {
      const binding = {};

      if (this.$vuetify.breakpoint.mdAndUp) {
        binding.column = true;
      }

      return binding;
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
    }
  }
});
