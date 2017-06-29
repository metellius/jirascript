// ==UserScript==
// @name         JIRA plus
// @namespace    http://tampermonkey.net/
// @version      0.2.13
// @description  go go jira
// @author       Harald Hvaal
// @match        https://jira-eng-gpk2.*.com/jira/*
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

(function() {
    'use strict';
    var navbar = $('.aui-nav')[1];

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

    function friendlyTime(secs) {
        var modulo = secs % 60;
        var str = modulo + (modulo == 1 ? " second" : " seconds");
        var mins = Math.floor(secs / 60);
        if (mins == 0)
            return str;
        if (mins == 1)
            return "1 minute, " + str;
        return mins + " minutes, " + str;
    }

    var state;
    var timeSpentOnCurrentBug = 0;
    var overtime = true;
    var bgHighlight = true;
    var timePerBug = 5;

    var startBtn = $('<li><a id="start_bugscrub" class="aui-button aui-button-primary aui-style "></a></li>');
    function updateStartBtnText() {
        startBtn.find('.aui-button').text(state.active ? "Stop bugscrub" : "Start bugscrub");
    }

    $('<li id="scrub_state"><span class="onthisbug"></span>         <span class="onbugscrub"></span></li>').prependTo(navbar);
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
        timePerBug = parseInt(prompt("Time per bug in seconds:", timePerBug));
    });

    function updateNavbarState(s) {
        var el = $('#scrub_state');
        el.find('.onthisbug').text(state.active ? "Time spent: " + friendlyTime(timeSpentOnCurrentBug) : "");
        el.find('.onbugscrub').text(state.active ? "(total: " + friendlyTime(s.totalTimeSpent) + ")" : "");
        $('#scrub_state span').css({position: "relative", top: "10px"});
    }

    function tick() {
        state = loadState();
        if (state.active) {
            state.totalTimeSpent += 1;
            var bug = currentBug();
            if (bug && document.hasFocus()) {
                if (!state.bugs[bug])
                    state.bugs[bug] = {
                        timeSpent: 0
                    };
                state.bugs[bug].timeSpent += 1;
                timeSpentOnCurrentBug = state.bugs[bug].timeSpent;
            }
            $('#time_per_bug_btn').show();
            $('#time_per_bug_btn').text("Set time limit (" + timePerBug + " secs)");
            $('#scrub_state').show();
            updateNavbarState(state);
        } else {
            $('#time_per_bug_btn').hide();
            $('#scrub_state').hide();
        }
        saveState(state);
        overtime = state.active && timeSpentOnCurrentBug > timePerBug;
        updateStartBtnText();
    }
    tick();
    setInterval(tick, 1000);

    setInterval(function() {
        if (overtime) {
            $("#issue-content").css({backgroundColor: "#fff3cd"});
            setTimeout(function() {
                $("#issue-content").css({backgroundColor: "white"});
            }, 100);
        }
    }, 3000);

    setInterval(function() {
        bgHighlight = overtime ? !bgHighlight : false;
        $('#scrub_state .onthisbug').css({color: bgHighlight ? "orange" : "white"});
    }, 500);

})();

