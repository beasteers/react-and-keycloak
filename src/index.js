import React from 'react';
import { Route, Redirect } from "react-router-dom";
import { useKeycloak, ReactKeycloakProvider } from '@react-keycloak/web';


const pyStrRStrip = (src, chars) => {
    var escaped = chars.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    return src.replace(RegExp("[" + escaped + "]+$", "gm"), '');
};

export { useKeycloak };

const KeycloakProvider = ({ 
        url, clientId, realm='master', 
        loginPath='/login', logoutPath='/logout', // TODO: how to connect these to login routes
        // minValidity=30, 
        // refreshRate=15, 
        onTokens, // callback function when tokens are refreshed. receives ({ token, refreshToken, idToken })
        // keycloak api reference: https://www.keycloak.org/docs/latest/securing_apps/#javascript-adapter-reference
        initOptions, // keycloak .init() arguments
        keycloakOptions, // keycloak() arguments
        offline=false,  // use an offline refresh token (basically refresh token won't expire, but it's also less secure)
        appendPath=true,  // set to false if you don't want to append /auth to your url (you probably do tho)
        children, ...props }) => {
    const [ keycloak, setKeycloak ] = React.useState(null);
    
    // append /auth because we need it, but it's annoying to add
    if(appendPath) {
      url = url.replace(/\/$/, '') + (appendPath === true ? '/auth' : appendPath);
    }
    url = pyStrRStrip(url, '/');

    // build constructor arguments
    keycloakOptions = keycloakOptions || {};
    if(offline) {
        keycloakOptions.scope = (keycloakOptions.scope ? keycloakOptions.scope + ' ' : keycloakOptions.scope) +  'offline_access';
    }

    // initialize keycloak object
    React.useEffect(() => {
        if (!clientId) { throw new Error('There is no client id configured'); }
        const create = () => {
            const tokens = tokensStash.get();
            const kc = wrapKeycloak(new window.Keycloak({ 
                url, realm, clientId, ...tokens, ...keycloakOptions,
            }));
            kc.loginPath = loginPath;
            kc.logoutPath = logoutPath;
            setKeycloak(kc);
        }
        if (!window.Keycloak) {
            insertScript(url + '/js/keycloak.js').then(() => {
                // console.log('loaded keycloak', window.Keycloak)
                create();
            });
            return
        }
        create()
    }, [url, realm, clientId]);
    
    return (keycloak && <ReactKeycloakProvider authClient={keycloak} onTokens={(tokens) => {
            tokensStash.set(tokens);
            onTokens && onTokens(tokens);
        }} initOptions={{
            // silentCheckSsoRedirectUri: true,
            ...initOptions
        }} {...props}>{children}</ReactKeycloakProvider>);
}
export default KeycloakProvider;


export const PrivateRoute = ({ render, ...routeProps }) => {
  const { keycloak } = useKeycloak();

  return (<Route {...routeProps}
      render={(props) => (
        (timeLeft(keycloak.tokenParsed) > 0 && render(props)) || 
          <Redirect to={{ pathname: '/login', state: { from: props.location } }} />
      )} />)
}


const Login = ({ children, redirectTo, loginOptions, location, onSuccess }) => {
    const { keycloak } = useKeycloak();
  
    React.useEffect(() => {
        if (keycloak.authenticated) {
            onSuccess && onSuccess(keycloak.token);
            return;
        }
        // Store the current path in session storage before leaving the application to log in on keycloak server
        location.state && location.state.redirectTo && redirectStash.set(location.state.redirectTo);
        keycloak.login(loginOptions || {});  // Redirect to keycloak login page
    }, [keycloak, location.state, onSuccess])
  
    return (
      (timeLeft(keycloak.tokenParsed) > 0 && (children || <div>Connecting...</div>)) || 
      <Redirect to={redirectStash.pop(redirectTo || '/')} />
    )
}

const Logout = ({ children, redirectTo, onSuccess }) => {
  const { keycloak } = useKeycloak();
  React.useEffect(() => {
    (keycloak.authenticated && keycloak.logout()) || (onSuccess && onSuccess());
  }, [keycloak, onSuccess]);

  return (
    (keycloak.authenticated && (children || <div>Disconnecting...</div>)) || 
    <Redirect to={redirectStash.pop(redirectTo || '/')} />
  )
}


export const Protect = ({ children, unprotected }) => {
    const { keycloak } = useKeycloak();
    return keycloak.authenticated && children() || (unprotected && unprotected())
}

export const LoginRoute = ({ path, redirectTo='/', ...props }) => {
    const { keycloak } = useKeycloak();
    return <Route path={path || keycloak.loginPath || '/login'} {...props} render={p => <Login redirectTo={redirectTo} {...p} />} />
}

export const LogoutRoute = ({ path, redirectTo='/', ...props }) => {
    const { keycloak } = useKeycloak();
    return <Route path={path || keycloak.logoutPath || '/logout'} {...props} render={p => <Logout redirectTo={redirectTo} {...p} />} />
}


export const RegisterRoute = ({ path, options, ...props }) => {
    const { keycloak } = useKeycloak();
    return <Route path={path || keycloak.registerPath || '/register'} {...props} render={p => <Redirect to={keycloak.createRegisterUrl(options)} {...p} />} />
}

export const AccountRoute = ({ path, options, ...props }) => {
    const { keycloak } = useKeycloak();
    return <Route path={path || keycloak.accountPath || '/account'} {...props} render={p => <Redirect to={keycloak.createAccountUrl(options)} {...p} />} />
}


// const getToken = (keycloak, name) => {
//     name = name ? name+'Token' : 'token';
//     return { token: keycloak[name], data: keycloak[name+'Parsed'] };
// }

export const timeLeft = (token) => token && token.exp ? token.exp - Math.ceil(new Date().getTime() / 1000) : 0;

export const useTock = (period=1) => {
    const [ time, setTime ] = React.useState(new Date().getTime() / 1000);
    React.useEffect(() => {
        const id = period && setInterval(() => setTime(new Date().getTime() / 1000), period*1000);
        return () => id && clearInterval(id);
    }, [period]);
    return time;
}

/* polls for token changes */
export const useToken = (period, name=null) => {
    const key = name ? name+'Token' : 'token';
    period = period == null ? (name === 'refresh' ? 10 : 1) : period;

    const [ tokens, setTokens ] = React.useState({});
    const { keycloak: K } = useKeycloak();
    React.useEffect(() => {
        if(period != false) {
            const check = () => {
                if(tokens.token !== K[key]) {
                    setTokens({ token: K[key], data: K[key+'Parsed'] })
                }
            }
            check();
            const id = period && setInterval(check, period*1000);
            return () => id && clearInterval(id);
        }
    }, [period, key, K, tokens]);
    return tokens;
}


/* This lets you add multiple events to keycloak */
const wrapKeycloak = (kc) => {
    const events = {}
    kc.on = (k, callback) => {
        const key = 'on' + k.charAt(0).toUpperCase() + k.slice(1);
        events[key].push(callback);
        return () => { events[key] = events[key].filter(c => c != callback); }
    }

    for(let k of ['onReady', 'onAuthSuccess', 'onAuthError', 'onAuthRefreshSuccess', 'onAuthRefreshError', 'onAuthLogout', 'onTokenExpired']) {
        events[k] = events[k] || [];
        if(kc[k]) kc.on(k, kc[k]);
        kc[k] = (...args) => events[k].map(cb => cb(...args));
    }
    return kc
}


class Stash {
    /* This lets us store a variable and retrieve it after getting redirected back. */
    constructor(key) { this.key = key }
    get(alt=null) { 
        const x = this._get();
        return x != null ? x : alt;
    }
    _get() { const x = JSON.parse(window.sessionStorage.getItem(this.key) || 'null'); return x } //  console.log('getting', x);
    set(value) { window.sessionStorage.setItem(this.key, JSON.stringify(value)); } // console.log('setting', value);
    delete() { window.sessionStorage.removeItem(this.key) } // console.log('deleting', this.key);
    pop(alt=null) { 
      const x = this.get(alt);
      this.delete();
      return x;
    }
}
const redirectStash = new Stash('keycloak-react-router:redirectTo');
const tokensStash = new Stash('keycloak-react-router:tokens');


const insertScript = (path) =>
    new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = path;
        s.onload = () => resolve(s);  // resolve with script, not event
        s.onerror = reject;
        document.body.appendChild(s);
    });