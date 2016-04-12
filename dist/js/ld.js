// model
var kb, g, f;
var CURR  = $rdf.Namespace("https://w3id.org/cc#");
var FOAF  = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
var RDFS  = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");

// view
var view;

// controller
var solid;
var app;


// HELPER FUNCTIONS
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


// INIT FUNCTIONS
function init() {
  initView();
  initRDF();
  initApp();
  initSolid();
}

function initView() {
  view = new Vue({
    el: '#app',
    data: {
      app: {
        namebold : 'Solid',
        name : 'Live',
        logo : ''
      },
      leftbar: {
        'dashboard' : false,
        'elements' : false,
        'forms' : false,
        'widgets' : false,
        'layoutoptions' : false,
        'tables' : false,
        'charts' : false,
        'calendar' : false,
        'examples' : false,
        'multilevel' : false,
        'documentation' : false,
        'labels' : false,
        'inbox' : true
      },
      topbar: {
        'tasks' : false,
        'notifications' : false,
        'messages' : true
      },
      user: {
        '@id' : 'https://melvincarvalho.com/#me',
        name: 'Login',
        avatar: "dist/img/avatar6.png",
        role: 'Web Developer',
        since: 'Nov. 2008',
        status: 'Online',
        loggedIn : false
      },
      profile: {
        '@id' : 'https://melvincarvalho.com/#me',
        name: 'Login',
        avatar: "dist/img/avatar6.png",
        role: 'Web Developer',
        since: 'Nov. 2008',
        status: 'Online'
      },
      rightbar: {
        'layout': true,
        'activity': false,
        'settings': false
      },
      widgets: {
        'dashboard': true,
        'summary': {
          work : 0,
          tidy: 0,
          workmore: '#',
          choresmore: '#'
        },
        'work': false,
        'chat': false,
        'todo': false,
        'inbox': false,
        'location': false,
        'performance': false,
        'calendar': false
      },
      inbox: {
        unread: 0
      }
    }
  })

}


/**
* init RDF knowledge base
*/
function initRDF() {
  var PROXY = "https://data.fm/proxy?uri={uri}";

  //var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
  var TIMEOUT = 60000;
  $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

  g = $rdf.graph();
  f = $rdf.fetcher(g, TIMEOUT);
};

function initSolid() {
  solid = require('solid');
}

function initApp() {
  app = app || {};

  app.wallets = [];
  app.workURI = undefined;
  app.choresURI = undefined;
  app.userURI = undefined;
  app.profileURI = undefined;
}

// FETCH FUNCTIONS
function fetchStats() {
  var uri = app.workURI + 'today?source=' + encodeURIComponent(app.userURI);
  //var workURI = 'http://melvincarvalho.com:11088/today?source=https://melvincarvalho.com/%23me';
  console.log('fetching :' + uri);
  $.get(uri, function( work ) {
    console.log(work);
    if (work && work['https://w3id.org/cc#amount']) {
      view.widgets.summary.work = work['https://w3id.org/cc#amount'];
    }
  });

  //var choresURI = 'http://melvincarvalho.com:11089/today?source=https://melvincarvalho.com/%23me';
  uri = app.choresURI + 'today?source=' + encodeURIComponent(app.userURI);
  console.log('fetching :' + uri);
  $.get(uri, function( work ) {
    console.log(work);
    if (work && work['https://w3id.org/cc#amount']) {
      view.widgets.summary.tidy = work['https://w3id.org/cc#amount'];
    }
  });
}

function fetchWallets() {

  f.nowOrWhenFetched(app.userURI, undefined, function(ok, body) {
    console.log('fetched '+ app.userURI );
    var w = g.statementsMatching($rdf.sym(app.userURI), CURR('wallet'));
    console.log(app.wallets);
    for (var i = 0; i < w.length; i++) {
      var wallet = w[i];
      var walletURI = wallet.object.uri;
      console.log('fetching : ' + walletURI);
      app.wallets.push(walletURI);

      f.nowOrWhenFetched(walletURI.split('#')[0], undefined, function(ok, body) {
        console.log('fetched : ' + walletURI);
        renderWallets();
      });
    }
  });

}


// RENDER FUNCTIONS
function renderWallets() {
  console.log('rendering wallets');
  console.log(app.wallets);
  for (var i = 0; i < app.wallets.length; i++) {
    var wallet = app.wallets[i];
    var type = g.any($rdf.sym(wallet), RDFS('label'));
    console.log('type for ' + wallet + ' is ' + type);
    if (type.value === 'work') {
      app.workURI = g.any($rdf.sym(wallet), CURR('api')).uri;
      console.log(app.workURI);
    }
    if (type.value === 'chores') {
      app.choresURI = g.any($rdf.sym(wallet), CURR('api')).uri;
      console.log(app.choresURI);
    }
    if (app.workURI && app.choresURI) {
      fetchStats();
    }
  }
}


function renderUser() {
  solid.identity.getProfile(app.userURI).then(function (parsedProfile) {
    console.log('getProfile result: %o', parsedProfile);
    kb = parsedProfile.parsedGraph;

    var name = kb.any($rdf.sym(app.userURI), FOAF('name'));
    var avatar = kb.any($rdf.sym(app.userURI), FOAF('depiction')) || kb.any($rdf.sym(app.userURI), FOAF('img'));
    console.log(name);
    console.log(avatar);
    if (name) {
      view.user.name = name.value;
    }
    if (avatar) {
      view.user.avatar = avatar.uri;
    }
    view.user.loggedIn = true;

    view.widgets.summary.workmore = 'http://taskify.org/c/dash.php?destination=' + encodeURIComponent(app.userURI);
    view.widgets.summary.choresmore = 'http://taskify.org/c/tidy.php?destination=' + encodeURIComponent(app.userURI);

    fetchWallets();
    addLogout();

  });

}

function renderProfile() {
  solid.identity.getProfile(app.userURI).then(function (parsedProfile) {
    console.log('getProfile result: %o', parsedProfile);
    kb = parsedProfile.parsedGraph;

    var name = kb.any($rdf.sym(app.userURI), FOAF('name'));
    var avatar = kb.any($rdf.sym(app.userURI), FOAF('depiction')) || kb.any($rdf.sym(app.userURI), FOAF('img'));
    console.log(name);
    console.log(avatar);
    if (name) {
      view.profile.name = name.value;
    }
    if (avatar) {
      view.profile.avatar = avatar.uri;
    }
    view.user.loggedIn = true;

    view.widgets.summary.workmore = 'http://taskify.org/c/dash.php?destination=' + encodeURIComponent(app.userURI);
    view.widgets.summary.choresmore = 'http://taskify.org/c/tidy.php?destination=' + encodeURIComponent(app.userURI);

    fetchWallets();
    addLogout();

  });

}

// EVENT FUNCTIONS
function addEvents() {
  addLogin();
}


function addLogin() {
  $('#login').on('click', function() {
    console.log('Logging in...');
    solid.login().then(function(webid){
      // authentication succeeded; do something with the WebID string
      console.log(webid);
      view.user.loggedIn = true;
      app.userURI = webid;
      app.profileURI = webid;
      renderUser();
      renderProfile();
    }).catch(function(err) {
      // authentication failed; display some error message
      console.log(err)
    })

  });
}

function addLogout() {

  $('#logout').on('click', function() {
    console.log('logging out...');
    view.user.loggedIn = false;
    view.user.avatar = "dist/img/avatar6.png";
    view.user.name = "Login";
    setTimeout(addLogin, 250);
  })

}


// MAIN
function main() {
  init();
  addEvents();

  app.userURI = getParameterByName('profile');
  app.profileURI = getParameterByName('profile');

  if (!app.userURI) return;

  renderUser();
  renderProfile();
  fetchWallets();

}



$(function () {



  main();
});
