// ==UserScript==
// @name         JIRA bugscrub
// @namespace    http://tampermonkey.net/
// @version      0.3.3
// @description  go go jira
// @author       Harald Hvaal
// @match        https://jira-eng-gpk2.cisco.com/jira/*
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

(function() {
    'use strict';
    var navbar = $('.aui-nav')[1];
    var state;
    var timeSpentOnCurrentBug = 0;
    var overtime = false;
    var borderVisible = false;
    var secsPerBug = GM_getValue("secsPerBug", 60);
    var startBtn = $('<li><a id="start_bugscrub" class="aui-button aui-button-primary aui-style "></a></li>');
    var tickInterval = 500;
    var stayQuietForBug = "";

    function currentBug() {
        var title = window.document.title;
        var matches = title.match(/CE-[0-9]+/);
        return matches ? matches[0] : "";
    }

    function defaultObj() {
        return {
            bugs: {},
            totalTimeSpent: 0,
            active: false
        };
    }

    function loadState() {
        return JSON.parse(GM_getValue("bugscrubstate", JSON.stringify(defaultObj())));
    }

    function saveState(s) {
        // console.log("storing state", JSON.stringify(s), s);
        GM_setValue("bugscrubstate", JSON.stringify(s));
    }

    function friendlyTime(ms) {
        var secs = Math.floor(ms / 1000);
        var modulo = secs % 60;
        var str = modulo + (modulo == 1 ? " sec" : " secs");
        var mins = Math.floor(secs / 60);
        if (mins == 0)
            return str;
        if (mins == 1)
            return "1 min, " + str;
        return mins + " mins, " + str;
    }

    function updateStartBtnText() {
        startBtn.find('.aui-button').text(state.active ? "Stop bugscrub" : "Start bugscrub");
    }

    function updateNavbarState(s) {
        var el = $('#scrub_state');
        if (!el.length) {
            var container = $('<div/>');
            el = $('<div id="scrub_state"><span class="state_text"/> <a class="ignore_link">Ignore for this bug</a></div>')
                .prependTo(container)
                .css({
                    display: "inline-block",
                    backgroundColor: "#ccc",
                    padding: ".2em",
                    borderWidth: ".3em",
                    // borderColor: "transparent",
                    borderStyle: "solid",
                    fontSize: "1.1em",
                    color: "#444"
                });
            container
                .css({
                    textAlign: "center",
                    height: 0
                })
                .prependTo($('#stalker'));
            el.find('.ignore_link')
                .css({
                    fontSize: ".8em",
                    cursor: "pointer"
                })
                .click(function() {
                    stayQuietForBug = currentBug();
                });
            container.hide();
            container.fadeIn(1000);
        }
        var sum = 0;
        var count = 0;
        for (var bug in state.bugs) {
            if (state.bugs[bug].timeSpent < 15 * 1000)
                continue;
            sum += state.bugs[bug].timeSpent;
            count++;
        }
        el.find('.state_text')
            .text(state.active ?
                  "This bug: " + friendlyTime(timeSpentOnCurrentBug) +
                  " (average " + friendlyTime(sum / count) +
                  ", total " + Math.floor(s.totalTimeSpent / 60 / 1000) + " mins)" : "");

        if (overtime) {
            if (stayQuietForBug === currentBug()) {
                borderVisible = false;
                el.find('.ignore_link').hide();
            } else {
                borderVisible = !borderVisible;
                el.find('.ignore_link').show();
            }
            el.css({
                borderColor: borderVisible ? "orange" : "transparent"
            });
        } else {
            el.find('.ignore_link').hide();
            el.css({
                borderColor: "transparent"
            });
        }
    }

    function tick() {
        state = loadState();
        if (state.active) {
            state.totalTimeSpent += tickInterval;
            var bug = currentBug();
            if (bug) {
                if (!state.bugs[bug])
                    state.bugs[bug] = {
                        timeSpent: 0
                    };
                if (document.hasFocus())
                    state.bugs[bug].timeSpent += tickInterval;
                timeSpentOnCurrentBug = state.bugs[bug].timeSpent;
            }
            $('#time_per_bug_btn').show();
            $('#time_per_bug_btn').text("Set time limit (" + secsPerBug + " secs)");
            $('#scrub_state').show();
            overtime = timeSpentOnCurrentBug > secsPerBug * 1000;
            updateNavbarState(state);
        } else {
            $('#time_per_bug_btn').hide();
            $('#scrub_state').hide();
        }
        saveState(state);
        updateStartBtnText();
    }

    startBtn.prependTo(navbar).click(function() {
        state.active = !state.active;
        if (state.active) {
            state = defaultObj();
            state.active = true;
        }
        updateStartBtnText();
        saveState(state);
    });
    $('<li><a id="time_per_bug_btn" class="aui-button aui-button-primary aui-style "></a></li>').prependTo(navbar).click(function() {
        var response = parseInt(prompt("Time per bug in seconds:", secsPerBug));
        if (!(response < 0) && !(response > 0) || response === 0)
            return;
        secsPerBug = response;
        GM_setValue("secsPerBug", secsPerBug);
    });

    tick();
    setInterval(tick, tickInterval);

})();

