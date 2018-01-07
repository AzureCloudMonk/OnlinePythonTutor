// Python Tutor: https://github.com/pgbovine/OnlinePythonTutor/
// Copyright (C) Philip Guo (philip@pgbovine.net)
// LICENSE: https://github.com/pgbovine/OnlinePythonTutor/blob/master/LICENSE.txt

// Implements shared sessions (a.k.a. Codechella)

// VERY IMPORTANT to grab the value of togetherjsInUrl before loading
// togetherjs-min.js, since loading that file deletes #togetherjs from URL
// NB: kinda gross global
//
// if this is true, this means that you JOINED SOMEONE ELSE'S SESSION
// rather than starting your own session
var togetherjsInUrl = !!(window.location.hash.match(/togetherjs=/)); // turn into bool
if (togetherjsInUrl) {
  console.log("togetherjsInUrl!");
} else {
  // if you're *not* loading a URL with togetherjs in it (i.e., joining into
  // an existing session), then do this hack at the VERY BEGINNING before
  // loading togetherjs-min.js to prevent TogetherJS from annoyingly
  // auto-starting when, say, you're in a shared session and reload
  // your browser (which can lead to weird interactions with the help queue)
  console.log("NOT togetherjsInUrl!");
  (window as any).TogetherJSConfig_noAutoStart = true;
}

require('script-loader!./lib/togetherjs/togetherjs-min.js');

require('script-loader!./lib/moment.min.js'); // https://momentjs.com/
declare var moment: any; // for TypeScript

require('script-loader!./lib/mobile-detect.min.js'); // http://hgoebl.github.io/mobile-detect.js/ https://github.com/hgoebl/mobile-detect.js
declare var MobileDetect: any; // for TypeScript

export var TogetherJS = (window as any).TogetherJS;


import {supports_html5_storage} from './opt-frontend-common';
import {OptFrontend} from './opt-frontend';
import {assert} from './pytutor';


// copy-pasta from // https://github.com/kidh0/jquery.idle
/**
 *  File: jquery.idle.js
 *  Title:  JQuery Idle.
 *  A dead simple jQuery plugin that executes a callback function if the user is idle.
 *  About: Author
 *  Henrique Boaventura (hboaventura@gmail.com).
 *  About: Version
 *  1.2.7
 *  About: License
 *  Copyright (C) 2013, Henrique Boaventura (hboaventura@gmail.com).
 *  MIT License:
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  - The above copyright notice and this permission notice shall be included in all
 *    copies or substantial portions of the Software.
 *  - THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *    SOFTWARE.
 **/
/*jslint browser: true */
/*global jQuery: false */
(function ($) {
  'use strict';

  $.fn.idle = function (options) {
    var defaults = {
        idle: 60000, //idle time in ms
        events: 'mousemove keydown mousedown touchstart', //events that will trigger the idle resetter
        onIdle: function () {}, //callback function to be executed after idle time
        onActive: function () {}, //callback function to be executed after back from idleness
        onHide: function () {}, //callback function to be executed when window is hidden
        onShow: function () {}, //callback function to be executed when window is visible
        keepTracking: true, //set it to false if you want to track only the first time
        startAtIdle: false,
        recurIdleCall: false
      },
      idle = options.startAtIdle || false,
      visible = !options.startAtIdle || true,
      settings = $.extend({}, defaults, options),
      lastId = null,
      resetTimeout,
      timeout;

    //event to clear all idle events
    $(this).on( "idle:stop", {}, function( event) {
      $(this).off(settings.events);
      settings.keepTracking = false;
      resetTimeout(lastId, settings);
    });

    resetTimeout = function (id, settings) {
      if (idle) {
        idle = false;
        settings.onActive.call();
      }
      clearTimeout(id);
      if(settings.keepTracking) {
        return timeout(settings);
      }
    };

    timeout = function (settings) {
      var timer = (settings.recurIdleCall ? setInterval : setTimeout), id;
      id = timer(function () {
        idle = true;
        settings.onIdle.call();
      }, settings.idle);
      return id;
    };

    return this.each(function () {
      lastId = timeout(settings);
      $(this).on(settings.events, function (e) {
        lastId = resetTimeout(lastId, settings);
      });
      if (settings.onShow || settings.onHide) {
        $(document).on("visibilitychange webkitvisibilitychange mozvisibilitychange msvisibilitychange", function () {
          if (document.hidden || (document as any).webkitHidden || (document as any).mozHidden || (document as any).msHidden) {
            if (visible) {
              visible = false;
              settings.onHide.call();
            }
          } else {
            if (!visible) {
              visible = true;
              settings.onShow.call();
            }
          }
        });
      }
    });

  };
}(jQuery));


// "Get live help!" survey versions

// initial pilot version: deployed on 2017-11-10, taken down on 2017-11-13
// deployed a single version of the survey to EVERYONE who requested or
// volunteered to help in the server logs under the /survey endpoint, i recorded
// *ONLY* those people who made a non-null response (for the most part) ...
// which is unlike subsequent versions, which record ALL impressions, even null
// responses, so that we can know approximately how many times each survey
// question got deployed and can thus get a rough response rate
/*
var liveHelpSurvey = {
  requestHelp:   [{prompt: 'You are now on the help queue. Please support our research by answering below: Why did you decide to ask for help at this time? What motivated you to click the "Get live help" button?',
                  v: 'r1'}],
  volunteerHelp: [{prompt: "Thanks for volunteering! You're about to join a live chat session. Please support our research by answering below: Why did you decide to volunteer at this time? What motivated you to click on this help link?",
                  v: 'h1'}],
};
*/

// second version, deployed on 2017-11-13. randomly select one of these
// questions to ask whenever a user triggers the survey, but save their
// responses in localStorage so that when they return, it will ask them
// a different question. starting from this version, th server logs
// under the /survey endpoint will record *all* responses to the survey,
// even null responses, since we can use that data to calculate survey
// response rates.
var liveHelpSurvey = {
  requestHelp:   [ {prompt: 'You\'re now on the help queue. Support our research by answering below:\n\nWhy did you decide to ask for help at this time? What motivated you to click the "Get live help" button?',
                    v: 'r2a'}, // identical to 'r1'
                   {prompt: 'You\'re now on the help queue. Support our research by answering below:\n\nWhy are you asking for help anonymously on this website? Are there people you know around you who can help as well?',
                    v: 'r2b'},
                   {prompt: 'You\'re now on the help queue. Support our research by answering below:\n\nHow did you first find this website? What are you currently using this website for?',
                    v: 'r2c'},
                 ],
  volunteerHelp: [ {prompt: "Thanks for volunteering! Support our research by answering below:\n\nWhy did you decide to volunteer at this time? What motivated you to click on this help link?",
                    v: 'h2a'}, // identical to 'h1'
                   {prompt: "Thanks for volunteering! Support our research by answering below:\n\nWhat is your current profession (e.g., student, teaching assistant, instructor)? Why are you using this website?",
                    v: 'h2b'},
                   {prompt: "Thanks for volunteering! Support our research by answering below:\n\nWhat kind of code are you working on right now? What made you decide to stop coding and volunteer at this time?",
                    v: 'h2c'},
                 ]
};

// randomly picks a survey item from liveHelpSurvey and mutates
// localStorage to record that this has been randomly picked, so it won't
// be picked again during the next call
function randomlyPickSurveyItem(key) {
  var lst = liveHelpSurvey[key];
  var filteredLst = [];

  // filter lst down to filteredLst to find all elements whose version
  // numbers 'v' does NOT already exist in localStorage
  if (supports_html5_storage()) {
    lst.forEach((e) => {
      if (!localStorage.getItem(e.v)) {
        filteredLst.push(e);
      }
    });
  } else {
    filteredLst = lst;
  }

  // if ALL entries have been filtered out, then reset everything and
  // start from scratch:
  if (filteredLst.length == 0) {
    if (supports_html5_storage()) {
      lst.forEach((e) => {
        localStorage.removeItem(e.v);
      });
    }
    filteredLst = lst;
  }

  // now randomly pick an entry and show it:
  // random number in [0, filteredLst.length)
  var randInt = Math.floor(Math.random() * filteredLst.length);
  var randomEntry = filteredLst[randInt];
  if (supports_html5_storage()) {
    localStorage.setItem(randomEntry.v, '1');
  }
  return randomEntry;
}



/* Record/replay TODOs (from first hacking on it on 2018-01-01)

  - make the recorder/player a subclass of OptFrontendSharedSessions
    with a separate html file and everything and special frontend tag
    (this.originFrontendJsFile) so that we can diambiguate its log
    entries in our server logs; otherwise it will look like people are
    executing a ton of the same pieces of code when they're simply
    demo code

  - we need to 'lock' the UI while the video is playing and only
    allow modifications once you push the 'pause' button and it's
    gotten a chance to save state

  - add VCR-style controls and scrubber for feature parity with
    video players (but what does it mean to go "backwards" here, since
    the togetherjs logs don't let you easily go backwards)

  - no ability to pause the 'video' yet, and even more difficult, if
    you pause and modify the code and want to 'resume' the video, you
    need to restore the appState from when you paused (maybe with
    getAppState?) and then resume from there. my hunch is that
    getAppState() is your friend here for restoring states mid-playback

  - things sometimes get flaky if you *ALREADY* have code in the editor
    and then try to record a demo; sometimes it doesn't work properly.

  - how can we best synchronize with my voice audio, since playback
    of events may lag a bit; make sure to set timeouts as precisely as
    possible in that case to prevent 'drift'; hopefully it's OK for the
    short-ish video clips that i'll be recording, but drift may worsen
    for longer clips

  - it would be nice to see a CURSOR in the Ace editor as the video
    is being played back ... right now the cursor doesn't visibly move
    - maybe issue an app-specific cursor event to show the cursor's
      position after each keystroke? this might be overkill, though.
      - oh, OR take the delta from the form-update event object and
        infer the cursor position from that, and then stick it into Ace;
        that could work!
    - also, it would be cool to get the user's current text block SELECTION
      too (bonus)
    - https://stackoverflow.com/questions/27625028/how-to-move-the-cursor-to-the-end-of-the-line-in-ace-editor

  - be able to stop playback in the middle without the timer getting all
    weird and loopy

  - minor: set a more instructive username for the tutor's mouse pointer
    - and also a better and more consistent COLOR

  - later: get this working better in live mode, which has some quirks
    - especially note handleUncaughtException in opt-live.ts since it
      currently doesn't call super.handleUncaughtException() so that might
      interfere with cache-related stuff

  - don't send events to the togetherjs when you're in recording or
    playback mode, so as not to overwhelm the logs. also it seems
    kinda silly that you need to connect to a remote server for this
    to work, since we don't require anything from the server
    - maybe make a mock websockets interface to FAKE a connection to the
      server so that we don't need a server at all? this seems crucial
      both for performance and for being able to ship tutorials as
      self-contained packages

*/


// represents a list of TogetherJS events that can be replayed, paused, etc.
// within the context of the current OptFrontendSharedSessions app
class OptDemoVideo {
  frontend: OptFrontendSharedSessions;
  initialAppState; // from getAppState()
  events = [];
  traceCache;
  isFrozen = false; // set to true after you finish recording to 'freeze'
                    // this tape and not allow any further modifications

  origIgnoreForms;  // for interfacing with TogetherJS
  fps = 30; // frames per second for setInterval-based playback

  constructor(frontend, serializedJsonStr=null) {
    this.frontend = frontend;

    // initialize from an existing JSON string created with serializeToJSON()
    if (serializedJsonStr) {
      var obj = JSON.parse(serializedJsonStr);

      this.initialAppState = obj.initialAppState;
      this.events = obj.events;
      this.traceCache = obj.traceCache;

      // VERY IMPORTANT -- set the traceCache entry of the frontend so
      // that it can actually be used. #tricky!
      // TODO: this is kind of a gross abstraction violation, eergh
      this.frontend.traceCache = this.traceCache;

      this.isFrozen = true; // freeze it!
      this.addFrameNumbers();
    }
  }

  // only record certain kinds of events in the recorder
  // see ../../v3/opt_togetherjs/server.js around line 460 for all
  static shouldRecordEvent(e) {
    // do NOT record cursor-click since that's too much noise
    return ((e.type == 'form-update') ||
            (e.type == 'cursor-update') ||
            (e.type == 'app.executeCode') ||
            (e.type == 'app.updateOutput') ||
            (e.type == 'pyCodeOutputDivScroll') ||
            (e.type == 'app.hashchange'));
  }

  addEvent(msg) {
    assert(!this.isFrozen);
    msg.ts = new Date().getTime(); // augment with timestamp
    msg.peer = {color: "#8d549f"}; // fake just enough of a peer object for downstream functions to work
    msg.sameUrl = true;
    if (OptDemoVideo.shouldRecordEvent(msg)) {
      this.events.push(msg);
    }
  }

  // do this BEFORE TogetherJS gets initialized
  startRecording() {
    assert(!this.isFrozen);
    assert(!TogetherJS.running);
    this.frontend.traceCacheClear();
    this.initialAppState = this.frontend.getAppState();
    // cache the current trace if we're in display mode
    if (this.initialAppState.mode == "display") {
      this.frontend.traceCacheAdd();
    }

    this.frontend.isRecordingDemo = true;
    TogetherJS.config('isDemoSession', true);
    TogetherJS(); // activate TogetherJS as the last step to start the recording
  }

  record() {
    assert(TogetherJS.running && this.frontend.isRecordingDemo && !this.frontend.isPlayingDemo);

    // set the TogetherJS eventRecorderFunc to this.demoVideo.addEvent
    // (don't forget to bind it as 'this', ergh!)
    TogetherJS.config('eventRecorderFunc', this.addEvent.bind(this));
  }

  stopRecording() {
    assert(!this.isFrozen);
    this.traceCache = this.frontend.traceCache;
    this.isFrozen = true; // freeze it!
    this.addFrameNumbers();

    this.frontend.isRecordingDemo = false;
    TogetherJS.config('isDemoSession', false);
    TogetherJS.config('eventRecorderFunc', null);

    // STENT - save to localStorage to test it
    localStorage['demoVideo'] = this.serializeToJSON();
  }

  setInitialAppState() {
    assert(this.initialAppState);
    this.frontend.pyInputSetValue(this.initialAppState.code);
    this.frontend.setToggleOptions(this.initialAppState);

    if (this.initialAppState.mode == 'display') {
      // we *should* get a cache hit in traceCache so this won't go to the server
      this.frontend.executeCode(this.initialAppState.curInstr);
    } else {
      assert(this.initialAppState.mode == 'edit');
      this.frontend.enterEditMode();
    }
  }

  startPlayback() {
    assert(this.isFrozen);
    assert(!TogetherJS.running); // do this before TogetherJS is initialized

    this.setInitialAppState(); // do this first!!!

    // save the original value of ignoreForms
    this.origIgnoreForms = TogetherJS.config.get('ignoreForms');
    // set this to true, which will have TogetherJS ignore ALL FORM
    // EVENTS, which means that it will ignore events fired on the Ace
    // editor (which are form-update events or somethin') ... if we
    // don't do that, then spurious events will get fired durin playback
    // and weird stuff will happen
    TogetherJS.config('ignoreForms', true);

    this.frontend.isPlayingDemo = true;
    TogetherJS.config('isDemoSession', true);
    TogetherJS(); // activate TogetherJS as the last step to start playback mode
  }

  static playEvent(msg, session) {
    //console.log("playEvent", msg);
    //this.frontend.pyInputAceEditor.resize(true);

    // seems weird but we need both session.hub.emit() and
    // TogetherJS._onmessage() in order to gracefully handle
    // both built-in TogetherJS events and custom OPT app events:
    // copied-pasted from lib/togetherjs/togetherjs/togetherjsPackage.js
    // around line 1870
    try {
      session.hub.emit(msg.type, msg);
    } catch (e) {
      console.warn(e);
      // let it go! let it go!
    }

    try {
      TogetherJS._onmessage(msg);
    } catch (e) {
      console.warn(e);
      // let it go! let it go!
    }

    // however, TogetherJS._onmessage mangles up the type fields
    // (UGH!), so we need to restore them back to their original
    // form to ensure idempotence. copied from session.appSend()
    var type = msg.type;
    if (type.search(/^togetherjs\./) === 0) {
      type = type.substr("togetherjs.".length);
    } else if (type.search(/^app\./) === -1) {
      type = "app." + type;
    }
    msg.type = type;
  }

  // this method uses a chain of setTimeouts fired one after another
  play() {
    assert(this.isFrozen);
    assert(TogetherJS.running && this.frontend.isPlayingDemo);

    // i think it may be important to grab the TogetherJS session HERE
    // every time you play (not globally); but i should verify that later
    var sess = TogetherJS.require("session");
    var evts = this.events;

    // for manual debugging:
    //window.sess = sess;
    //window.evts = evts;

    if (evts.length <= 0) {
      $("#togetherjsStatus").html("DONE playing recording");
      TogetherJS(); // toggles off
      return;
    }


    // to play the events trace in 'real time', set one timeout at a time,
    // and as soon as that one starts executing, set the next timeout
    var setAllTimeouts = (i) => {
      assert(i > 0);
      setTimeout(() => {
        if (i >= evts.length - 1) {
          $("#togetherjsStatus").html("DONE playing recording");
          TogetherJS(); // toggles off
          return;
        }

        setAllTimeouts(i+1); // set the next timeout right away before performing your action!
        console.log("FIRE", i);
        OptDemoVideo.playEvent(evts[i], sess);
      }, evts[i].ts - evts[i-1].ts);
    };

    // play the 0th event after a tiny delay (for some reason it doesn't
    // work properly if you play it right away) ...
    setTimeout(() => {OptDemoVideo.playEvent(evts[0], sess);}, 100);
    setAllTimeouts(1); // now start at index 1
  }

  // this method *instantaneously* plays all steps from 0 to n-1
  // (so everything it calls should work SYNCHRONOUSLY)
  playFirstNSteps(n: number) {
    assert(this.isFrozen);
    assert(TogetherJS.running && this.frontend.isPlayingDemo);

    // i think it may be important to grab the TogetherJS session HERE
    // every time you play (not globally); but i should verify that later
    var sess = TogetherJS.require("session");
    var evts = this.events;

    this.setInitialAppState(); // reset app state to the initial one

    // OK this is super subtle but important. you want to call setInit
    // defined deep in the bowels of lib/togetherjs/togetherjs/togetherjsPackage.js
    // why are we calling it right now? because we need to clear the
    // edit history that TogetherJS captures to start us over with a
    // clean slate so that we can start replaying events from the start
    // of the trace. otherwise form-update events in the Ace editor
    // won't work.
    var setInit = TogetherJS.config.get('setInit');
    setInit();

    for (var i = 0; i < n; i++) {
      OptDemoVideo.playEvent(evts[i], sess);
    }

    //$("#togetherjsStatus").html("DONE playing recording to step " + n);
    console.log("DONE playFirstNSteps", n);
    //TogetherJS(); // toggles off - STENT: don't toggle it off yet!
  }

  // given a frame number, convert to the number of the first step that
  // takes place AFTER the given frame number. we can pass this into
  // playFirstNSteps since that will play only until the frame *before* it
  frameToStepNumber(n) {
    assert(this.isFrozen && this.events[0].frameNum);
    var foundIndex = -1;
    for (var i = 0; i < this.events.length; i++) {
      if (n < this.events[i].frameNum) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex < 0) {
      foundIndex = this.events.length;
    }
    return foundIndex;
  }

  stopPlayback() {
    this.frontend.isPlayingDemo = false;
    TogetherJS.config('ignoreForms', this.origIgnoreForms); // restore its original value
    TogetherJS.config('isDemoSession', false);
    TogetherJS.config('eventRecorderFunc', null);
  }

  // serialize the current state to JSON:
  serializeToJSON() {
    assert(this.isFrozen);

    var ret = {initialAppState: this.initialAppState,
               events: this.events,
               traceCache: this.traceCache};
    return JSON.stringify(ret);
  }

  getFrameDiff(a, b) {
    assert(a <= b);
    return Math.floor(((b - a) / 1000) * this.fps);
  }

  // add a frameNum field for each entry in this.events
  addFrameNumbers() {
    assert(this.isFrozen && this.events.length > 0);
    var firstTs = this.events[0].ts;
    for (var i = 0; i < this.events.length; i++) {
      var elt = this.events[i];
      // add 1 so that the first frameNum starts at 1 instead of 0
      elt.frameNum = this.getFrameDiff(firstTs, elt.ts) + 1;
    }
  }

  // how many frames should there be in the animation?
  getTotalNumFrames() {
    assert(this.isFrozen && this.events.length > 0);

    var firstTs = this.events[0].ts;
    var lastTs = this.events[this.events.length-1].ts;

    // add 1 at the end for extra padding
    return this.getFrameDiff(firstTs, lastTs) + 1;
  }
}

export class OptFrontendSharedSessions extends OptFrontend {
  executeCodeSignalFromRemote = false;
  togetherjsSyncRequested = false;
  pendingCodeOutputScrollTop = null;
  updateOutputSignalFromRemote = false;

  // TODO: unify these 3 booleans into 1 unified one:
  wantsPublicHelp = false;
  isRecordingDemo = false;
  isPlayingDemo = false;

  demoVideo: OptDemoVideo;

  disableSharedSessions = false; // if we're on mobile/tablets, disable this entirely since it doesn't work on mobile
  isIdle = false;
  peopleIveKickedOut = []; // #savage

  fullCodeSnapshots = []; // a list of full snapshots of code taken at given times, with:
  curPeekSnapshotIndex = -1;  // current index you're peeking at inside of fullCodeSnapshots, -1 if not peeking at anything

  constructor(params={}) {
    super(params);
    this.initTogetherJS();

    this.pyInputAceEditor.getSession().on("change", (e) => {
      // unfortunately, Ace doesn't detect whether a change was caused
      // by a setValue call
      if (TogetherJS.running && !this.isPlayingDemo) {
        TogetherJS.send({type: "codemirror-edit"});
      }
    });

    // NB: don't sync changeScrollTop for Ace since I can't get it working yet
    //this.pyInputAceEditor.getSession().on('changeScrollTop', () => {
    //  if (typeof TogetherJS !== 'undefined' && TogetherJS.running) {
    //    $.doTimeout('codeInputScroll', 100, function() { // debounce
    //      // note that this will send a signal back and forth both ways
    //      // (there's no easy way to prevent this), but it shouldn't keep
    //      // bouncing back and forth indefinitely since no the second signal
    //      // causes no additional scrolling
    //      TogetherJS.send({type: "codeInputScroll",
    //                       scrollTop: pyInputGetScrollTop()});
    //    });
    //  }
    //});

    var md = new MobileDetect(window.navigator.userAgent);
    if (md.mobile()) { // mobile or tablet device
      this.disableSharedSessions = true;
    }

    if (this.disableSharedSessions) {
      return; // early exit, so we don't do any other initialization below here ...
    }


    var ssDiv = `

<button id="requestHelpBtn" type="button" class="togetherjsBtn" style="margin-bottom: 6pt; font-weight: bold;">
Get live help! (NEW!)
</button>

<div id="ssDiv">
  <button id="sharedSessionBtn" type="button" class="togetherjsBtn" style="font-size: 9pt;">
  Start private chat session
  </button>

  <br/>
  <button id="recordBtn" type="button" class="togetherjsBtn" style="font-size: 9pt;">
  Record demo
  </button>

  <br/>
  <button id="playbackBtn" type="button" class="togetherjsBtn" style="font-size: 9pt;">
  Play recording
  </button>

  <div style="margin-top: 5px; font-size: 8pt;">
  <a href="https://www.youtube.com/watch?v=oDY7ScMPtqI" target="_blank">How do I use this?</a>
  </div>
</div>

<div id="sharedSessionDisplayDiv" style="display: none; margin-right: 5px;">
  <button id="stopTogetherJSBtn" type="button" class="togetherjsBtn">
  Stop this chat session
  </button>

  <div style="width: 200px; font-size: 8pt; color: #666; margin-top: 8px;">
  Note that your chat logs and code may be recorded, anonymized, and
  analyzed for our research.
  </div>
</div>
`;

    var togetherJsDiv = `
<div id="togetherjsStatus">
  <div id="publicHelpQueue"></div>
</div>
`;

    $("td#headerTdLeft").append(ssDiv);
    $("td#headerTdRight").append(togetherJsDiv);

    // do this all after creating the DOM elements above dynamically:
    $("#sharedSessionBtn").click(this.startSharedSession.bind(this, false));
    $("#stopTogetherJSBtn").click(TogetherJS); // toggles off
    $("#requestHelpBtn").click(this.requestPublicHelpButtonClick.bind(this));

    $("#recordBtn").click(this.startRecording.bind(this));
    $("#playbackBtn").click(this.startPlayback.bind(this));

    // jquery.idle:
    ($(document) as any).idle({
      onIdle: () => {
        this.isIdle = true;
        console.log('I\'m idle');
      },
      onActive: () => {
        this.isIdle = false; // set this first!
        console.log('I\'m back!');
        // update the help queue as soon as you're back:
        this.getHelpQueue();
        // ... and maybe snappy snapshot it
        this.periodicMaybeTakeSnapshot();
      },
      idle: 60 * 1000 // 1-minute timeout by default for idleness
    })

    // polling every 5 seconds seems reasonable; note that you won't
    // send an HTTP request to the server when this.isIdle is true, to conserve
    // resources and get a more accurate indicator of who is active at
    // the moment
    setInterval(this.getHelpQueue.bind(this), 5 * 1000);
    this.getHelpQueue(); // call it once on page load

    // update this pretty frequently; doesn't require any ajax calls:
    setInterval(this.updateModerationPanel.bind(this), 2 * 1000);

    // take a snapshot every 30 seconds or so if you're in a TogetherJS
    // session and not idle
    setInterval(this.periodicMaybeTakeSnapshot.bind(this), 30 * 1000);

    setInterval(this.periodicMaybeChatNudge.bind(this), 60 * 1000);

    // add an additional listener in addition to whatever the superclasses added
    window.addEventListener("hashchange", (e) => {
      if (TogetherJS.running && !this.isPlayingDemo && !this.isExecutingCode) {
        TogetherJS.send({type: "hashchange",
                         appMode: this.appMode,
                         codeInputScrollTop: this.pyInputGetScrollTop(),
                         myAppState: this.getAppState()});
      }
    });

    // shut down TogetherJS if it's still running
    // (use 'on' to add an additional listener in addition to whatever event
    // handlers the superclasses already added)
    $(window).on('beforeunload', () => {
      if (TogetherJS.running) {
        TogetherJS();
      }
    });
    $(window).on('unload', () => {
      if (TogetherJS.running) {
        TogetherJS();
      }
    });
  }

  langToEnglish(lang) {
    if (lang === '2') {
      return 'Python2';
    } else if (lang === '3') {
      return 'Python3';
    } else if (lang === 'java') {
      return 'Java';
    } else if (lang === 'js') {
      return 'JavaScript';
    } else if (lang === 'ts') {
      return 'TypeScript';
    } else if (lang === 'ruby') {
      return 'Ruby';
    } else if (lang === 'c') {
      return 'C';
    } else if (lang === 'cpp') {
      return 'C++';
    }
    return '???'; // fail soft, even though this shouldn't ever happen
  }

  getHelpQueue() {
    // VERY IMPORTANT: to avoid overloading the server, don't send these
    // requests when you're idle
    if (this.isIdle) {
      $("#publicHelpQueue").empty(); // clear when idle so that you don't have stale results
      return; // return early!
    }

    var ghqUrl = TogetherJS.config.get("hubBase").replace(/\/*$/, "") + "/getHelpQueue";
    $.ajax({
      url: ghqUrl,
      dataType: "json",
      data: {user_uuid: this.userUUID}, // tell the server who you are
      error: () => {
        console.log('/getHelpQueue error');

        if (this.wantsPublicHelp) {
          $("#publicHelpQueue").html('ERROR: help server is down. If you had previously asked for help, something is wrong; stop this session and try again later.');
        } else {
          $("#publicHelpQueue").empty(); // avoid showing stale results
        }
      },
      success: (resp) => {
        var displayEmptyQueueMsg = false;
        var me = this;
        if (resp && resp.length > 0) {
          $("#publicHelpQueue").empty();

          var myShareId = TogetherJS.shareId();

          var regularEntries = [];
          var grayedOutEntries = [];
          var idleTimeoutMs = 3 * 60 * 1000 // 3 minutes seems reasonable

          resp.forEach((e) => {
            // sometimes there are bogus incomplete entries on the queue. if
            // there's not even a URL, then nobody can join the chat,
            // so skip right away at the VERY BEGINNING:
            if (!e.url) {
              return;
            }

            // when testing on localhost, we sometimes use the
            // production TogetherJS chat server, but we don't want to
            // show localhost entries on the global queue for people on
            // the real site since there's no way they can jump in to join
            //
            // i.e., if your browser isn't on localhost but the URL of
            // the help queue entry is on localhost, then *don't* display it
            if ((window.location.href.indexOf('localhost') < 0) &&
                (e.url.indexOf('localhost') >= 0)) {
              return;
            }

            // use moment.js to generate human-readable relative times:
            var d = new Date();
            var timeSinceCreationStr = moment(d.valueOf() - e.timeSinceCreation).fromNow();
            var timeSinceLastMsgStr = moment(d.valueOf() - e.timeSinceLastMsg).fromNow();
            var langName = this.langToEnglish(e.lang);

            var curStr = e.username;

            if (e.country && e.city) {
              // print 'region' (i.e., state) for US addresses:
              if (e.country === "United States" && e.region) {
                curStr += ' from ' + e.city + ', ' + e.region + ', US needs help with ' + langName;
              } else {
                curStr += ' from ' + e.city + ', ' + e.country + ' needs help with ' + langName;
              }
            } else if (e.country) {
              curStr += ' from ' + e.country + ' needs help with ' + langName;
            } else if (e.city) {
              curStr += ' from ' + e.city + ' needs help with ' + langName;
            } else {
              curStr += ' needs help with ' + langName;
            }

            if (e.id === myShareId) {
              curStr += ' - <span class="redBold">this is you!</span>';
            } else {
              // only display this if there's *currently* more than 1
              // person in the session AND more than 1 person has chatted.
              if ((e.numClients > 1) && (e.numChatters > 1)) {
                if (e.numChatters < e.numClients) {
                  curStr += ' - ' + String(e.numChatters) + ' people chatting';
                } else { // subtle: can't have more chatters than current clients
                  curStr += ' - ' + String(e.numClients) + ' people chatting';
                }
              }
              curStr += ` - <a class="gotoHelpLink" data-id="${e.id}" href="${e.url}" target="_blank">click to help</a>`;
            }

            if (e.timeSinceLastMsg < idleTimeoutMs) {
              curStr += ' <span class="helpQueueSmallText">(active ' + timeSinceLastMsgStr  + ', requested ' + timeSinceCreationStr + ') </span>';
              regularEntries.push(curStr);
            } else {
              curStr += ' <span class="helpQueueSmallText">(IDLE: last active ' + timeSinceLastMsgStr  + ', requested ' + timeSinceCreationStr + ') </span>';
              grayedOutEntries.push(curStr);
            }
          });

          if ((regularEntries.length + grayedOutEntries.length) > 0) {
            if (!this.wantsPublicHelp) {
              $("#publicHelpQueue").html('<div style="margin-bottom: 5px;">These Python Tutor users are asking for help right now. Please volunteer to help!</div>');
            } else {
              // if i'm asking for public help and am currently on the
              // queue, eliminate this redundant message:
              $("#publicHelpQueue").html('');
            }

            regularEntries.forEach((e) => {
              $("#publicHelpQueue").append('<li>' + e + '</li>');
              $("#publicHelpQueue a.gotoHelpLink").last().css('font-weight', 'bold');
            });
            // gray it out to make it not look as prominent
            grayedOutEntries.forEach((e) => {
              $("#publicHelpQueue").append('<li style="color: #888;">' + e + '</li>');
            });

            // add these handlers AFTER the respective DOM nodes have been added above:

            $(".gotoHelpLink").click(function() {
              var surveyItem = randomlyPickSurveyItem('volunteerHelp');
              var miniSurveyResponse = prompt(surveyItem.prompt);

              // always log every impression, even if miniSurveyResponse is blank,
              // since we can know how many times that survey question was ever seen:
              var idToJoin = $(this).attr('data-id');
              var surveyUrl = TogetherJS.config.get("hubBase").replace(/\/*$/, "") + "/survey";
              $.ajax({
                url: surveyUrl,
                dataType: "json",
                data: {id: idToJoin, user_uuid: me.userUUID, kind: 'volunteerHelp', v: surveyItem.v, response: miniSurveyResponse},
                success: function() {}, // NOP
                error: function() {},   // NOP
              });

              return true; // ALWAYS cause the link to be clicked
            });
          } else {
            displayEmptyQueueMsg = true;
          }
        } else {
          displayEmptyQueueMsg = true;
        }

        if (displayEmptyQueueMsg) {
          if (this.wantsPublicHelp) {
            $("#publicHelpQueue").html('Nobody is currently asking for help. If you had previously asked for help, something is wrong; stop this session and try again later.');
          } else {
            $("#publicHelpQueue").html('Nobody is currently asking for help using the "Get live help!" button.');
          }
        }
      },
    });
  }

  // did I *originally* create this session, or did I join?
  meCreatedThisSession() {
    if (!TogetherJS.running) {
      return false;
    }

    var session = TogetherJS.require("session");
    var meIsCreator = !session.isClient; // adapted from lib/togetherjs/togetherjs/togetherjsPackage.js
    return meIsCreator;
  }

  // this will be called periodically, so make sure it doesn't block
  // execution by, say, taking too long:
  updateModerationPanel() {
    // only do this if you initiated the session AND TogetherJS is currently on
    if (!TogetherJS.running || !this.meCreatedThisSession()) {
      return;
    }

    $("#moderationPanel").empty(); // always start from scratch

    var allPeers = TogetherJS.require("peers").getAllPeers();
    var livePeers = [];
    allPeers.forEach((e) => {
      if (e.status !== "live") { // don't count people who've already left!!!
        return;
      }
      var clientId = e.id;
      var username = e.name;
      livePeers.push({username: username, clientId: clientId});
    });

    if (livePeers.length > 0) {
      if (this.wantsPublicHelp) {
        $("#moderationPanel").append(`
          <button id="stopRequestHelpBtn" type="button" class="togetherjsBtn"
                  style="margin-bottom: 6pt; font-size: 10pt; padding: 4px;">
            Don't let any more people join this session
          </button><br/>`);
        $("#stopRequestHelpBtn").click(this.initStopRequestingPublicHelp.bind(this));
      } else {
        $("#moderationPanel").append('This is a private session. ');
        if (!$("#requestHelpBtn").is(':visible')) {
          $("#requestHelpBtn").show(); // make sure there's a way to get back on the queue
        }
      }

      $("#moderationPanel").append('Kick out disruptive users: ');
      livePeers.forEach((e) => {
        $("#moderationPanel").append('<button class="kickLink">' + e.username + '</button>');
        $("#moderationPanel .kickLink").last()
          .data('clientId', e.clientId)
          .data('username', e.username);
      });

      var me = this; // ugh
      $("#moderationPanel .kickLink").click(function() { // need jQuery $(this) so can't use => arrow function
        var idToKick = $(this).data('clientId');
        var confirmation = confirm('Press OK to kick and ban ' + $(this).data('username') + ' from this session.');
        if (confirmation) {
          TogetherJS.send({type: "kickOut", idToKick: idToKick});
          me.peopleIveKickedOut.push(idToKick);
        }
      });
    } else {
      if (this.wantsPublicHelp) {
        $("#moderationPanel").html('Nobody is here yet. Please be patient and keep working normally.');
      } else {
        $("#moderationPanel").html('This is a private session, so nobody can join unless you send them the URL below. To ask for public help, click the "Get live help!" button at the left.');
        if (!$("#requestHelpBtn").is(':visible')) {
          $("#requestHelpBtn").show(); // make sure this is shown since we say it in instructions
        }
      }
    }
  }

  // important overrides to inject in pieces of TogetherJS functionality
  // without triggering spurious error messages
  ignoreAjaxError(settings) {
    if (settings.url.indexOf('togetherjs') > -1) {
      return true;
    } else if (settings.url.indexOf('getHelpQueue') > -1) {
      return true;
    } else if (settings.url.indexOf('requestPublicHelp') > -1) {
      return true;
    } else if (settings.url.indexOf('survey') > -1) {
      return true;
    } else if (settings.url.indexOf('nudge') > -1) {
      return true;
    } else if (settings.url.indexOf('freegeoip') > -1) { // deprecated
      return true;
    } else {
      return super.ignoreAjaxError(settings);
    }
  }

  logEditDelta(delta) {
    super.logEditDelta(delta);
    if (TogetherJS.running && !this.isPlayingDemo) {
      TogetherJS.send({type: "editCode", delta: delta});
    }
  }

  startExecutingCode(startingInstruction=0) {
    if (TogetherJS.running && !this.isPlayingDemo && !this.executeCodeSignalFromRemote) {
      TogetherJS.send({type: "executeCode",
                       myAppState: this.getAppState(),
                       forceStartingInstr: startingInstruction,
                       rawInputLst: this.rawInputLst});
    }

    super.startExecutingCode(startingInstruction);
  }

  updateAppDisplay(newAppMode) {
    super.updateAppDisplay(newAppMode); // do this first!

    // now this.appMode should be canonicalized to either 'edit' or 'display'
    if (this.appMode === 'edit') {
      // pass
    } else if (this.appMode === 'display') {
      assert(this.myVisualizer);

      if (!TogetherJS.running) {
        $("#surveyHeader").show();
      }

      if (this.pendingCodeOutputScrollTop) {
        this.myVisualizer.domRoot.find('#pyCodeOutputDiv').scrollTop(this.pendingCodeOutputScrollTop);
        this.pendingCodeOutputScrollTop = null;
      }

      $.doTimeout('pyCodeOutputDivScroll'); // cancel any prior scheduled calls

      // TODO: this might interfere with experimentalPopUpSyntaxErrorSurvey (2015-04-19)
      this.myVisualizer.domRoot.find('#pyCodeOutputDiv').scroll(function(e) {
        var elt = $(this);
        // debounce
        $.doTimeout('pyCodeOutputDivScroll', 100, function() {
          // note that this will send a signal back and forth both ways
          if (TogetherJS.running && !this.isPlayingDemo) {
            // (there's no easy way to prevent this), but it shouldn't keep
            // bouncing back and forth indefinitely since no the second signal
            // causes no additional scrolling
            TogetherJS.send({type: "pyCodeOutputDivScroll",
                             scrollTop: elt.scrollTop()});
          }
        });
      });
    } else {
      assert(false);
    }
  }

  finishSuccessfulExecution() {
    assert (this.myVisualizer);

    if (this.isRecordingDemo) {
      this.traceCacheAdd(); // add to cache only if we're recording a demo
    }

    this.myVisualizer.add_pytutor_hook("end_updateOutput", (args) => {
      if (this.updateOutputSignalFromRemote) {
        return [true]; // die early; no more hooks should run after this one!
      }

      if (TogetherJS.running && !this.isPlayingDemo && !this.isExecutingCode) {
        TogetherJS.send({type: "updateOutput", step: args.myViz.curInstr});
      }
      return [false]; // pass through to let other hooks keep handling
    });

    // do this late since we want the hook in this function to be installed
    // FIRST so that it can run before the hook installed by our superclass
    super.finishSuccessfulExecution();

    // VERY SUBTLE -- reinitialize TogetherJS at the END so that it can detect
    // and sync any new elements that are now inside myVisualizer
    if (TogetherJS.running) {
      // TogetherJS.reinitialize() is ASYNCHRONOUS so the signal handler runs
      // way too late when we're playing a demo all at once using playFirstNSteps()
      // because all calls must be synchronous. in that case, use the
      // synchronous "equivalent":
      if (this.isPlayingDemo) {
        var setInit = TogetherJS.config.get('setInit');
        setInit(); // this is synchronous so it happens instantly
                   // TODO: does this do everything we need or do we
                   // need to pull out more functionality from the handler
                   // of TogetherJS.reinitialize()?
      } else {
        TogetherJS.reinitialize();
      }
    }
  }

  handleUncaughtException(trace: any[]) {
    super.handleUncaughtException(trace); // do this first

    // do this even if execution fails
    if (this.isRecordingDemo) {
      this.traceCacheAdd(); // add to cache only if we're recording a demo
    }
  }

  // subclasses can override
  updateOutputTogetherJsHandler(msg) {
    if (!msg.sameUrl) return; // make sure we're on the same page
    if (this.isExecutingCode) {
      return;
    }

    if (this.myVisualizer) {
      // to prevent this call to updateOutput from firing its own TogetherJS event
      this.updateOutputSignalFromRemote = true;
      try {
        this.myVisualizer.renderStep(msg.step);
      }
      finally {
        this.updateOutputSignalFromRemote = false;
      }
    }
  }

  initTogetherJS() {
    assert(TogetherJS);

    if (togetherjsInUrl) { // kinda gross global
      $("#ssDiv,#surveyHeader").hide(); // hide ASAP!
      $("#togetherjsStatus").html("Please wait ... loading live help chat session");
    }

    // clear your name from the cache every time to prevent privacy leaks
    if (supports_html5_storage()) {
      localStorage.removeItem('togetherjs.settings.name');
    }


    // this event triggers when some new user joins (whether it's you or
    // someone else) and says 'hello' ... the server attempts to
    // geolocate their IP address server-side (since it's more accurate
    // than doing it client-side, apparently) ...
    TogetherJS.hub.on("togetherjs.pg-hello-geolocate", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page

      // make sure clientId isn't YOU so you don't display info about yourself:
      var myClientId = TogetherJS.clientId();
      if (msg.clientId != myClientId) {
        var geo = msg.geo;
        var curStr;

        // follow the same format as how geolocation data is displayed
        // in the public help queue
        if (geo.country_name && geo.city) {
          // print 'region_name' (i.e., state) for US addresses:
          if (geo.country_name === "United States" && geo.region_name) {
            curStr = geo.city + ', ' + geo.region_name + ', US';
          } else {
            curStr = geo.city + ', ' + geo.country_name;
          }
        } else if (geo.country_name) {
          curStr = geo.country_name;
        } else if (geo.city) {
          curStr = geo.city;
        }

        if (curStr) {
          curStr = 'Someone from ' + curStr + ' just joined this chat.';
          this.chatbotPostMsg(curStr);
        }
      }
    });

    // This event triggers when you first join a session and say 'hello',
    // and then one of your peers says hello back to you. If they have the
    // exact same name as you, then change your own name to avoid ambiguity.
    // Remember, they were here first (that's why they're saying 'hello-back'),
    // so they keep their own name, but you need to change yours :)
    TogetherJS.hub.on("togetherjs.hello-back", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page
      var p = TogetherJS.require("peers");

      var peerNames = p.getAllPeers().map(e => e.name);

      if (msg.name == p.Self.name) {
        var newName = undefined;
        var toks = msg.name.split(' ');
        var count = Number(toks[1]);

        // make sure the name is truly unique, incrementing count as necessary
        do {
          if (!isNaN(count)) {
            newName = toks[0] + '_' + String(count + 1); // e.g., "Tutor 3"
            count++;
          }
          else {
            // the original name was something like "Tutor", so make
            // newName into, say, "Tutor 2"
            newName = p.Self.name + '_2';
            count = 2;
          }
        } while ($.inArray(newName, peerNames) >= 0); // i.e., is newName in peerNames?

        p.Self.update({name: newName}); // change our own name
      }
    });

    TogetherJS.hub.on("updateOutput", this.updateOutputTogetherJsHandler.bind(this));

    TogetherJS.hub.on("executeCode", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page
      if (this.isExecutingCode) {
        return;
      }

      this.executeCodeSignalFromRemote = true;
      try {
        this.executeCode(msg.forceStartingInstr, msg.rawInputLst);
      }
      finally {
        this.executeCodeSignalFromRemote = false;
      }
    });

    TogetherJS.hub.on("hashchange", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page
      if (this.isExecutingCode) {
        return;
      }

      if (msg.appMode != this.appMode) {
        this.updateAppDisplay(msg.appMode);

        if (this.appMode == 'edit' && msg.codeInputScrollTop !== undefined &&
            this.pyInputGetScrollTop() != msg.codeInputScrollTop) {
          // hack: give it a bit of time to settle first ...
          $.doTimeout('pyInputCodeMirrorInit', 200, () => {
            this.pyInputSetScrollTop(msg.codeInputScrollTop);
          });
        }
      }
    });

    TogetherJS.hub.on("codemirror-edit", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page
      $("#codeInputWarnings").hide();
      $("#someoneIsTypingDiv").show();

      $.doTimeout('codeMirrorWarningTimeout', 500, () => { // debounce
        $("#codeInputWarnings").show();
        $("#someoneIsTypingDiv").hide();
      });
    });

    TogetherJS.hub.on("requestSync", (msg) => {
      // DON'T USE msg.sameUrl check here since it doesn't work properly, eek!
      TogetherJS.send({type: "myAppState",
                       myAppState: this.getAppState(),
                       codeInputScrollTop: this.pyInputGetScrollTop(),
                       pyCodeOutputDivScrollTop: this.myVisualizer ?
                                                 this.myVisualizer.domRoot.find('#pyCodeOutputDiv').scrollTop() :
                                                 undefined});
    });

    // if you *received* this signal from someone, that means someone new just
    // joined your session. check if you've previously kicked them out ...
    // if so, FORCEABLY kick them out again to prevent people from somehow
    // sneaking back into your session. thus, we have defense in depth of
    // enforcing the ban from both the client and server sides ...
    TogetherJS.hub.on("initialAppState", (msg) => {
      // take a snapshot whenever someone joins your session so that if
      // they destroy/deface your code, at least you can restore it to
      // what was there right before they joined
      this.takeFullCodeSnapshot();

      this.peopleIveKickedOut.forEach((e) => {
        if (e === msg.clientId) {
          console.log(e, "trying to sneak back in, kicking out again", this.peopleIveKickedOut);
          TogetherJS.send({type: "kickOutAgainBecauseSnuckBackIn", idToKick: e}); // server doesn't do anything with this; just log it for posterity
          TogetherJS.send({type: "kickOut", idToKick: e});
        }
      });
    });

    TogetherJS.hub.on("myAppState", (msg) => {
      // DON'T USE msg.sameUrl check here since it doesn't work properly, eek!

      // if we didn't explicitly request a sync, then don't do anything
      if (!this.togetherjsSyncRequested) {
        return;
      }

      this.togetherjsSyncRequested = false;

      var learnerAppState = msg.myAppState;

      if (learnerAppState.mode == 'display') {
        if (OptFrontendSharedSessions.appStateEq(this.getAppState(), learnerAppState)) {
          // update curInstr only
          console.log("on:myAppState - app states equal, renderStep", learnerAppState.curInstr);
          this.myVisualizer.renderStep(learnerAppState.curInstr);

          if (msg.pyCodeOutputDivScrollTop !== undefined) {
            this.myVisualizer.domRoot.find('#pyCodeOutputDiv').scrollTop(msg.pyCodeOutputDivScrollTop);
          }
        } else if (!this.isExecutingCode) { // if already executing from a prior signal, ignore
          console.log("on:myAppState - app states unequal, executing", learnerAppState);
          this.syncAppState(learnerAppState);

          this.executeCodeSignalFromRemote = true;
          try {
            if (msg.pyCodeOutputDivScrollTop !== undefined) {
              this.pendingCodeOutputScrollTop = msg.pyCodeOutputDivScrollTop;
            }
            var learnerRawInputLst = JSON.parse(learnerAppState.rawInputLstJSON);
            if (learnerRawInputLst && learnerRawInputLst.length > 0) {
              this.executeCode(learnerAppState.curInstr, learnerRawInputLst);
            } else {
              this.executeCode(learnerAppState.curInstr);
            }
          }
          finally {
            this.executeCodeSignalFromRemote = false;
          }
        }
      } else {
        assert(learnerAppState.mode == 'edit');
        if (!OptFrontendSharedSessions.appStateEq(this.getAppState(), learnerAppState)) {
          console.log("on:myAppState - edit mode sync");
          this.syncAppState(learnerAppState);
          this.enterEditMode();
        }
      }

      if (msg.codeInputScrollTop !== undefined) {
        // give pyInputAceEditor a bit of time to settle with
        // its new value. this is hacky; ideally we have a callback for
        // when setValue() completes.
        $.doTimeout('pyInputCodeMirrorInit', 200, () => {
          this.pyInputSetScrollTop(msg.codeInputScrollTop);
        });
      }
    });

    TogetherJS.hub.on("syncAppState", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page
      this.syncAppState(msg.myAppState);
    });

    TogetherJS.hub.on("codeInputScroll", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page
      // don't sync for Ace editor since I can't get it working properly yet
    });

    TogetherJS.hub.on("pyCodeOutputDivScroll", (msg) => {
      if (!msg.sameUrl) return; // make sure we're on the same page
      if (this.myVisualizer) {
        this.myVisualizer.domRoot.find('#pyCodeOutputDiv').scrollTop(msg.scrollTop);
      }
    });

    // someone issued a kickOut message to kick somebody out of the
    // session; maybe it's you, maybe it isn't ...
    TogetherJS.hub.on("kickOut", (msg) => {
      var myClientId = TogetherJS.clientId();
      //console.log('RECEIVED kickOut', msg.idToKick, myClientId);
      // disconnect yourself if idToKick matches your client id:
      if (msg.idToKick && msg.idToKick === myClientId) {
        // first send a message of shame to the server ...
        TogetherJS.send({type: "iGotKickedOut",
                         clientId: myClientId,
                         user_uuid: this.userUUID});

        // then nuke all of your shared sessions controls so that you
        // have to restart a new browser session before trying to get
        // back into anything; otherwise you might be able to jump back
        // in instantly using your same session #weird:
        $("#requestHelpBtn,#ssDiv").remove(); // totally remove them, eeek!

        TogetherJS(); // ... then shut down TogetherJS
      }
    });

    // fired when TogetherJS is activated. might fire on page load if there's
    // already an open session from a prior page load in the recent past.
    TogetherJS.on("ready", () => {
      console.log("TogetherJS ready");

      $("#sharedSessionDisplayDiv").show();
      $("#ssDiv,#testCasesParent").hide();

      // send this to the server for the purposes of logging, but other
      // clients shouldn't do anything with this data
      if (TogetherJS.running && !this.isPlayingDemo) {
        TogetherJS.send({type: "initialAppState",
                         myAppState: this.getAppState(),
                         user_uuid: this.userUUID,
                         // so that you can tell whether someone else
                         // shared a TogetherJS URL with you to invite you
                         // into this shared session:
                         togetherjsInUrl: togetherjsInUrl}); // kinda gross global
      }

      this.requestSync(); // immediately try to sync upon startup so that if
                          // others are already in the session, we will be
                          // synced up. and if nobody is here, then this is a NOP.

      this.TogetherjsReadyHandler();
      this.redrawConnectors(); // update all arrows at the end
    });

    // emitted when TogetherJS is closed. This is not emitted when the
    // webpage simply closes or navigates elsewhere, ONLY when TogetherJS
    // is explicitly stopped via a call to TogetherJS()
    TogetherJS.on("close", () => {
      console.log("TogetherJS close");

      $("#togetherjsStatus").html('<div id="publicHelpQueue"></div>'); // clear it (tricky! leave a publicHelpQueue node here!)
      $("#sharedSessionDisplayDiv").hide();
      $("#ssDiv,#requestHelpBtn,#testCasesParent").show();

      this.TogetherjsCloseHandler();
      this.redrawConnectors(); // update all arrows at the end
    });
  }

  requestSync() {
    if (TogetherJS.running) {
      this.togetherjsSyncRequested = true;
      TogetherJS.send({type: "requestSync"});
    }
  }

  syncAppState(appState) {
    this.setToggleOptions(appState);

    // VERY VERY subtle -- temporarily prevent TogetherJS from sending
    // form update events while we set the input value. otherwise
    // this will send an incorrect delta to the other end and screw things
    // up because the initial states of the two forms aren't equal.
    var orig = TogetherJS.config.get('ignoreForms');
    TogetherJS.config('ignoreForms', true);
    this.pyInputSetValue(appState.code);
    TogetherJS.config('ignoreForms', orig);

    if (appState.rawInputLst) {
      this.rawInputLst = $.parseJSON(appState.rawInputLstJSON);
    } else {
      this.rawInputLst = [];
    }
  }

  // TogetherJS is ready to rock and roll, so do real initiatlization all here:
  TogetherjsReadyHandler() {
    this.takeFullCodeSnapshot();
    $("#surveyHeader").hide();

    // disable syntax and runtime surveys when shared sessions is on:
    this.activateSyntaxErrorSurvey = false;
    this.activateRuntimeErrorSurvey = false;
    this.activateEurekaSurvey = false;
    $("#eureka_survey").remove(); // if a survey is already displayed on-screen, then kill it

    if (this.isRecordingDemo) {
      this.demoVideo.record();
    } else if (this.isPlayingDemo) {
      //this.demoVideo.play();
      // STENT for debugging only
      console.log('see window.demoVideo');
      window.demoVideo = this.demoVideo;
    } else if (this.wantsPublicHelp) {
      this.initRequestPublicHelp();
    } else {
      this.initPrivateSharedSession();
    }
  }

  TogetherjsCloseHandler() {
    if (this.appMode === "display") {
      $("#surveyHeader").show();
    }
    this.wantsPublicHelp = false; // explicitly reset it

    // reset all recording-related stuff too!
    if (this.isRecordingDemo) {
      this.demoVideo.stopRecording();
      assert(!this.isRecordingDemo);
    }
    if (this.isPlayingDemo) {
      this.demoVideo.stopPlayback();
      assert(!this.isPlayingDemo);
    }
  }

  startSharedSession(wantsPublicHelp) {
    $("#ssDiv,#surveyHeader").hide(); // hide ASAP!
    $("#togetherjsStatus").html("Please wait ... loading live help chat session");
    TogetherJS();
    this.wantsPublicHelp = wantsPublicHelp; // TODO: unify everything into 1 boolean
  }

  startRecording() {
    $("#ssDiv,#surveyHeader").hide(); // hide ASAP!
    $("#togetherjsStatus").html("Recording now ...");

    this.demoVideo = new OptDemoVideo(this);
    this.demoVideo.startRecording();
  }

  startPlayback() {
    $("#ssDiv,#surveyHeader").hide(); // hide ASAP!

    // TODO: make this code cleaner
    $("#togetherjsStatus").html('<div>Playing recording ...</div><div id="playbackSlider"/><div style="margin-top: 20px;" id="timeSlider"/>');

    // temporary test for debugging only! load an existing one
    if (!this.demoVideo) {
      var savedVideoJson = localStorage['demoVideo'];
      if (savedVideoJson) {
        this.demoVideo = new OptDemoVideo(this, savedVideoJson);
      }
    }

    assert(this.demoVideo);

    var sliderDiv = $('#playbackSlider');
    sliderDiv.css('width', '700px');

    sliderDiv.slider({
      min: 0, max: this.demoVideo.events.length-1, step: 1,
      slide: (evt, ui) => {
        //console.log("playbackSlider slide", ui.value);
        this.demoVideo.playFirstNSteps(ui.value);
      }
    });

    // disable keyboard actions on the slider itself (to prevent double-firing
    // of events), and make skinnier and taller
    sliderDiv
      .find(".ui-slider-handle")
      .unbind('keydown')
      .css('width', '0.6em')
      .css('height', '1.5em');


    var timeSliderDiv = $('#timeSlider');
    timeSliderDiv.css('width', '700px');

    var curStep = -1;

    timeSliderDiv.slider({
      min: 0, max: this.demoVideo.getTotalNumFrames(), step: 1,
      slide: (evt, ui) => {
        console.log("timeSlider slide", ui.value);
        // avoid unnecessary duplicate calls
        var step = this.demoVideo.frameToStepNumber(ui.value);
        if (step != curStep) {
          this.demoVideo.playFirstNSteps(step);
          curStep = step;
        }
      }
    });

    // disable keyboard actions on the slider itself (to prevent double-firing
    // of events), and make skinnier and taller
    timeSliderDiv
      .find(".ui-slider-handle")
      .unbind('keydown')
      .css('width', '0.6em')
      .css('height', '1.5em');

    this.demoVideo.startPlayback();
  }

  requestPublicHelpButtonClick() {
    if (TogetherJS.running) {
      // TogetherJS is already running
      this.wantsPublicHelp = true;
      this.initRequestPublicHelp();
    } else {
      // TogetherJS isn't running yet, so start up a shared session AND
      // request public help at the same time ...
      this.startSharedSession(true);
    }
  }

  // return whether two states match, except don't worry about curInstr
  static appStateEq(s1, s2) {
    assert(s1.origin == s2.origin); // sanity check!

    return (s1.code == s2.code &&
            s1.mode == s2.mode &&
            s1.cumulative == s2.cumulative &&
            s1.heapPrimitives == s1.heapPrimitives &&
            s1.textReferences == s2.textReferences &&
            s1.py == s2.py &&
            s1.rawInputLstJSON == s2.rawInputLstJSON);
  }

  initRequestPublicHelp() {
    assert(this.wantsPublicHelp);
    assert(TogetherJS.running);

    // first make a /requestPublicHelp request to the TogetherJS server:
    var rphUrl = TogetherJS.config.get("hubBase").replace(/\/*$/, "") + "/requestPublicHelp";
    var shareId = TogetherJS.shareId();
    var shareUrl = TogetherJS.shareUrl();
    var lang = this.getAppState().py;
    var getUserName = TogetherJS.config.get("getUserName");
    var username = getUserName();

    $.ajax({
      url: rphUrl,
      dataType: "json",
      data: {id: shareId, url: shareUrl, lang: lang, username: username, user_uuid: this.userUUID},
      success: this.doneRequestingPublicHelp.bind(this),
      error: this.rphError.bind(this),
    });

  }

  rphError() {
    alert("ERROR in getting live help. This isn't working at the moment. Please try again later.");
    if (TogetherJS.running) {
      TogetherJS(); // shut down TogetherJS
    }
    this.redrawConnectors(); // update all arrows at the end
  }

  doneRequestingPublicHelp(resp) {
    assert(TogetherJS.running);

    if (resp.status === "OKIE DOKIE") {
      $("#togetherjsStatus").html(`
        <div id="moderationPanel"></div>
        <div style="margin-bottom: 10px;">You have requested help as <b>` +
        TogetherJS.config.get("getUserName")() +
        `</b> (see below for queue). Anyone currently on this website can volunteer to help you, but there is no guarantee that someone will come help. <span style="color: #888; font-size: 8pt;">Use this service at your own risk. We are not responsible for the chat messages or behaviors of this site's users.</span></div>
        <div id="publicHelpQueue"></div>`);
      this.updateModerationPanel(); // update it right away
      this.getHelpQueue(); // update it right away
      this.appendTogetherJsFooter();
      $("#requestHelpBtn").hide();
    } else {
      alert("ERROR in getting live help. This isn't working at the moment. Please try again later.");
      if (TogetherJS.running) {
        TogetherJS(); // shut down TogetherJS
      }
    }

    var surveyItem = randomlyPickSurveyItem('requestHelp');
    var miniSurveyResponse = prompt(surveyItem.prompt);

    // always log every impression, even if miniSurveyResponse is blank,
    // since we can know how many times that survey question was ever seen:
    var shareId = TogetherJS.shareId();
    var surveyUrl = TogetherJS.config.get("hubBase").replace(/\/*$/, "") + "/survey";
    $.ajax({
      url: surveyUrl,
      dataType: "json",
      data: {id: shareId, user_uuid: this.userUUID, kind: 'requestHelp', v: surveyItem.v, response: miniSurveyResponse},
      success: function() {}, // NOP
      error: function() {},   // NOP
    });

    this.redrawConnectors(); // update all arrows at the end
  }

  initStopRequestingPublicHelp() {
    var rphUrl = TogetherJS.config.get("hubBase").replace(/\/*$/, "") + "/requestPublicHelp";
    var shareId = TogetherJS.shareId();
    $.ajax({
      url: rphUrl,
      dataType: "json",
      data: {id: shareId, user_uuid: this.userUUID, removeFromQueue: true}, // stop requesting help!
      success: this.doneStopRequestingPublicHelp.bind(this),
      error: () => {
        alert("Server error: request failed. Please try again later.");
      },
    });
  }

  doneStopRequestingPublicHelp() {
    this.wantsPublicHelp = false;
    this.initPrivateSharedSession();
  }

  initPrivateSharedSession() {
    assert(!this.wantsPublicHelp);

    if (!this.meCreatedThisSession()) { // you've joined someone else's session
      // if you're joining someone else's session, disable ALL chat
      // controls so that the only way out of the chat is to close your window;
      // otherwise confusion arises when you quit out of the session and
      // start a new one in the *same* window, which will re-join that
      // session just cuz that's how TogetherJS works; it's hella confusing.
      $("td#headerTdLeft").hide(); // TODO: make a better name for this!

      $("#togetherjsStatus").html("<div>Thanks for helping! Your username is <b>" + TogetherJS.config.get("getUserName")() + "</b>. Close this window when you're done.</div>");
    } else { // you started your own session
      var urlToShare = TogetherJS.shareUrl();
      $("#togetherjsStatus").html(`
        <div id="moderationPanel"></div>
        URL for others to join: <input type="text" style="font-size: 10pt;
        font-weight: bold; padding: 3px;
        margin-top: 3pt;
        margin-bottom: 6pt;"
        id="togetherjsURL" size="70" readonly="readonly"/>`);
      $("#togetherjsURL").val(urlToShare).attr('size', urlToShare.length + 20);
      this.updateModerationPanel(); // update it right away
    }

    this.appendTogetherJsFooter();
    this.redrawConnectors(); // update all arrows at the end
  }

  appendTogetherJsFooter() {
    var extraHtml = '<div style="margin-top: 3px; margin-bottom: 10px; font-size: 8pt;">This is a <span style="color: #e93f34;">highly experimental</span> feature. Use at your own risk. Do not move or type too quickly. If you get out of sync, click: <button id="syncBtn" type="button">force sync</button> <a href="https://docs.google.com/forms/d/126ZijTGux_peoDusn1F9C1prkR226897DQ0MTTB5Q4M/viewform" target="_blank">Report bugs/feedback</a></div>';
    $("#togetherjsStatus").append(extraHtml);
    $("#syncBtn").click(this.requestSync.bind(this));
  }

  // mutates this.fullCodeSnapshots. snapshots the ENTIRE contents of
  // the code rather than a diff, for simplicity.
  // don't do this too frequently or else things might blow up.
  takeFullCodeSnapshot() {
    // don't do this if we're in demo mode
    if (this.isRecordingDemo || this.isPlayingDemo) {
      return;
    }

    var curCod = this.pyInputGetValue();

    // brute-force search through all of this.fullCodeSnapshots for an
    // exact duplicate ... if it exists, then don't snapshot it again.
    // this is super crude/potentially-inefficient but is the most robust
    // way to check for changes in light of weird TogetherJS happenings
    for (var i=0; i < this.fullCodeSnapshots.length; i++) {
      var e = this.fullCodeSnapshots[i];
      if (e == curCod) {
        return; // RETURN EARLY if there's a duplicate match!!!
      }
    }

    this.fullCodeSnapshots.push(curCod);
    console.log('takeFullCodeSnapshot', this.fullCodeSnapshots.length, 'idx:', this.curPeekSnapshotIndex);

    // only give the option to restore old versions if YOU started this session,
    // or else it's too confusing if everyone gets to restore as a free-for-all.
    // also wait until this.fullCodeSnapshots has more than 1 element.
    if ((this.fullCodeSnapshots.length > 1) &&
        ($("#codeInputWarnings #snapshotHistory").length == 0) /* if you haven't rendered it yet */ &&
        this.meCreatedThisSession()) {

      $("#codeInputWarnings #liveModeExtraWarning").remove(); // for ../live.html
      $("#codeInputWarnings").append(`
        <span id="snapshotHistory" style="font-size: 9pt; margin-left: 5px;">
          Restore old code:
          <button id="prevSnapshot">&lt; Prev</button>
          <span id="curSnapIndex"/>/<span id="numTotalSnaps"/>
          <button id="nextSnapshot">Next &gt;</button>
        </span>`);

      $("#snapshotHistory #prevSnapshot").click(() => {
        if (this.curPeekSnapshotIndex == 0) {
          return;
        }
        this.takeFullCodeSnapshot(); // try to snapshot *first* before you change the code

        if (this.curPeekSnapshotIndex < 0) {
          this.curPeekSnapshotIndex = this.fullCodeSnapshots.length - 1;
        }
        this.curPeekSnapshotIndex--;
        this.renderCodeSnapshot();

        TogetherJS.send({type: "snapshotPeek", btn: 'prev', idx: this.curPeekSnapshotIndex, tot: this.fullCodeSnapshots.length});
      });

      $("#snapshotHistory #nextSnapshot").click(() => {
        if (this.curPeekSnapshotIndex >= this.fullCodeSnapshots.length - 1) {
          return;
        }
        if (this.curPeekSnapshotIndex < 0) {
          return; // meaningless if you're not peeking
        }
        this.takeFullCodeSnapshot(); // try to snapshot *first* before you change the code
        this.curPeekSnapshotIndex++;
        this.renderCodeSnapshot();

        TogetherJS.send({type: "snapshotPeek", btn: 'next', idx: this.curPeekSnapshotIndex, tot: this.fullCodeSnapshots.length});
      });
    }

    // SUPER SUBTLE SH*T -- if we're taking a new snapshot, bring us to the
    // "latest" version right now, which means that we're no longer peeking
    this.curPeekSnapshotIndex = -1;

    // update the display at the end if necessary
    this.renderCodeSnapshot();
  }

  renderCodeSnapshot() {
    // always update the display
    $("#codeInputWarnings #numTotalSnaps").html(String(this.fullCodeSnapshots.length));

    if (this.curPeekSnapshotIndex < 0) {
      $("#codeInputWarnings #curSnapIndex").html(String(this.fullCodeSnapshots.length));
    } else {
      $("#codeInputWarnings #curSnapIndex").html(String(this.curPeekSnapshotIndex + 1));
    }

    // if we're not peeking, then no need to re-render:
    if (this.curPeekSnapshotIndex < 0) {
      return;
    }

    //console.log('renderCodeSnapshot', this.fullCodeSnapshots.length, this.curPeekSnapshotIndex);

    var curCod = this.pyInputGetValue();
    var cod;
    // this shouldn't happen but fail-soft just in case
    if (this.curPeekSnapshotIndex >= this.fullCodeSnapshots.length) {
      cod = this.fullCodeSnapshots[this.fullCodeSnapshots.length - 1];
    } else {
      cod = this.fullCodeSnapshots[this.curPeekSnapshotIndex];
    }
    if (curCod != cod) { // don't re-render unless absolutely necessary
      this.pyInputSetValue(cod);
    }
  }

  // only take a snapshot in a shared session where you're not idle
  periodicMaybeTakeSnapshot() {
    if (TogetherJS.running && !this.isIdle) {
      this.takeFullCodeSnapshot();
    }
  }

  // send an encouraging nudge message in the chat box if you're not idle ...
  // deployed on 2017-12-10
  periodicMaybeChatNudge() {
    // only do this if you're:
    // - currently in a chat
    // - not idle
    // - NOBODY else is in your sesssion besides you (i.e., no 'live' peers)
    if (!TogetherJS.running || this.isIdle) {
      return;
    }

    var allPeers = TogetherJS.require("peers").getAllPeers();
    var numLivePeers = 0;
    allPeers.forEach((e) => {
      if (e.status !== "live") { // don't count people who've already left!!!
        return;
      }
      numLivePeers++;
    });

    if (numLivePeers > 0) {
      return;
    }

    // MASSIVE MASSIVE MASSIVE copy-and-paste from getHelpQueue()
    var ghqUrl = TogetherJS.config.get("hubBase").replace(/\/*$/, "") + "/getHelpQueue";
    $.ajax({
      url: ghqUrl,
      dataType: "json",
      data: {user_uuid: this.userUUID}, // tell the server who you are
      error: () => {
        console.log('/getHelpQueue error');
      },
      success: (resp) => {
        if (resp && resp.length > 0) {
          var myShareId = TogetherJS.shareId();

          var chatMsgs = [];
          var idleTimeoutMs = 3 * 60 * 1000 // 3 minutes seems reasonable -- NB: copy-and-paste from getHelpQueue()

          var selfOnQueue = false;
          resp.forEach((e) => {
            if (e.id === myShareId) {
              selfOnQueue = true;
            }
          });

          if (!selfOnQueue) {
            return; // don't bother doing anything if you're not even on the help queue
          }

          var otherActiveEntries = []; // what other entries are active so that we can nudge you to join them?
          resp.forEach((e) => {
            // sometimes there are bogus incomplete entries on the queue. if
            // there's not even a URL, then nobody can join the chat,
            // so skip right away at the VERY BEGINNING:
            if (!e.url) {
              return;
            }

            // when testing on localhost, we sometimes use the
            // production TogetherJS chat server, but we don't want to
            // show localhost entries on the global queue for people on
            // the real site since there's no way they can jump in to join
            //
            // i.e., if your browser isn't on localhost but the URL of
            // the help queue entry is on localhost, then *don't* display it
            if ((window.location.href.indexOf('localhost') < 0) &&
                (e.url.indexOf('localhost') >= 0)) {
              return;
            }

            // don't bother showing idle entries to the user since these
            // people are probably away from their computer at the moment:
            if (e.timeSinceLastMsg >= idleTimeoutMs) {
              return;
            }

            // don't show your own entry!
            if (e.id === myShareId) {
              return;
            }

            // skip this entry if there's more than 1 person chatting at
            // the moment, because we want to show only the sessions
            // waiting on queue with NOBODY helping them out right now:
            if ((e.numClients > 1) && (e.numChatters > 1)) {
              return;
            }

            otherActiveEntries.push(e);
          });

          otherActiveEntries.forEach((e) => {
            var curStr = '\n- Click to help ' + e.username;
            var langName = this.langToEnglish(e.lang);

            if (e.country && e.city) {
              // print 'region' (i.e., state) for US addresses:
              if (e.country === "United States" && e.region) {
                curStr += ' from ' + e.city + ', ' + e.region + ', US with ' + langName;
              } else {
                curStr += ' from ' + e.city + ', ' + e.country + ' with ' + langName;
              }
            } else if (e.country) {
              curStr += ' from ' + e.country + ' with ' + langName;
            } else if (e.city) {
              curStr += ' from ' + e.city + ' with ' + langName;
            } else {
              curStr += ' with ' + langName;
            }

            curStr += ': ' + e.url;

            chatMsgs.push(curStr);
          });

          if (chatMsgs.length > 0) {
            var finalMsg = 'Please be patient and keep working normally. Note that these other users also need help. If you help them, maybe they can help you in return.';
            chatMsgs.forEach((e) => {
              finalMsg += e;
            });
            this.chatbotPostMsg(finalMsg);

            // log an entry on the server to aid in data analysis later:
            var nudgeUrl = TogetherJS.config.get("hubBase").replace(/\/*$/, "") + "/nudge";
            $.ajax({
              url: nudgeUrl,
              dataType: "json",
              data: {id: myShareId, user_uuid: this.userUUID, entriesJSON: JSON.stringify(otherActiveEntries)},
              success: function() {}, // NOP
              error: function() {},   // NOP
            });
          }
        }
      },
    });
  }

  // helper chatbot which posts a message in your chat box that *only you can see*
  chatbotPostMsg(msg) {
    if (!TogetherJS.running) {
      return;
    }

    var ui = TogetherJS.require("ui");
    var sess = TogetherJS.require("session");
    var p = TogetherJS.require("peers");

    // mimic what's in lib/togetherjs/togetherjs/togetherjsPackage.js
    ui.chat.text({text: 'CHATBOT: ' + msg,
                  messageId: sess.clientId + "-" + Date.now(),
                  peer: p.Self,
                  notify: false});
  }

} // END class OptFrontendSharedSessions
