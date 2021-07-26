# react-and-keycloak

A simple interface to use React Router and Keycloak together.

It is a thin wrapper around `@react-keycloak/web` that makes everything nice and easy to use. I also ported over and simplified the logic from `react-router-keycloak` which 

## Usage

In `index.jsx`
```jsx
import React from 'react';
import KeycloakProvider from 'react-and-keycloak';
import Routes from './routes';


const kcParams = {
  url: 'https://auth.mydomain.com',
  realm: 'master', // optional
  // a public client cuz you dont wanna put a clientSecret on a public webpage
  clientId: 'myclient',
};

const App = ({}) => {
    return (
        <KeycloakProvider {...kcParams} onEvent={console.log} onTokens={console.log}>
            <Routes />
        </KeycloakProvider>
    )
}

```

And then in `routes.jsx`
```jsx
import { useKeycloak } from '@react-keycloak/web';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { PrivateRoute, LoginRoute, LogoutRoute } from 'react-and-keycloak';

function Routes() {
  const { initialized, keycloak } = useKeycloak();

if (!initialized) {
    return <div>Loadinggggg...</div>
  }

  const token = keycloak && keycloak.token;
  return (
      <main>          
          <Router>
              <Route exact path="/" render={() => 
                  <div>
                      A public home page <p>Token: {token}</p>
                  </div>} />
              <LoginRoute redirectTo="/token" />
              <LogoutRoute redirectTo="/" />
              <PrivateRoute path="/private" render={() => 
                  <div>
                      A private page <p>Token: {token}</p>
                      <Link to="/private2">other</Link>
                  </div>} />
              <PrivateRoute path="/private2" render={() => 
                  <div>
                      Another private page <p>Token: {token}</p>
                      <Link to="/private">other</Link>
                  </div>} />
          </Router>
      </main>
  )
}

```

## API Reference

#### KeycloakProvider
This is responsible for holding the Keycloak JS object and providing it to the child elements. This goes at the top of the DOM hierarchy.

```jsx
// defaults
<KeycloakProvider {...{
    // connection parameters for keycloak
    url,  // the keycloak base url
    clientId,  // the keycloak client id
    realm='master',  // the keycloak realm

    loginPath='/login',  // the login route to redirect to
    logoutPath='/logout', // TODO: how to connect these to login routes
    onTokens,  // callback function when tokens are refreshed. receives ({ token, refreshToken, idToken })
    // keycloak api reference: https://www.keycloak.org/docs/latest/securing_apps/#javascript-adapter-reference
    initOptions, // keycloak .init() arguments
    keycloakOptions, // keycloak() arguments
    offline=false,  // use an offline refresh token (basically refresh token won't expire, but it's higher risk)
    appendPath=null,  // set to false if you don't want to append /auth to your url (you probably do tho)
    children,  // children components that can access the keycloak object
    ...props
}} />
```

For keycloak options: [docs](https://github.com/keycloak/keycloak-documentation/blob/master/securing_apps/topics/oidc/javascript-adapter.adoc#constructor)
For init options: [docs](https://github.com/keycloak/keycloak-documentation/blob/master/securing_apps/topics/oidc/javascript-adapter.adoc#initoptions)

##### Example
The simplest configuration you could provide:
```jsx
<KeycloakProvider url='auth.myproject.com' clientId='myapp'>
    <App />
</KeycloakProvider>
```

#### PrivateRoute
This let's you create a react router route that is only accessible when you're logged in.

If you aren't, it will redirect you to the Keycloak login page.
```jsx
<PrivateRoute {...{
    render,  // the route render function
    ...routeProps,  // the rest of the route props
}}>
```

##### Example
```jsx
<Router>
    <PrivateRoute path="/private" render={() => 
        <div>I am a dark secret</div>} />
</Router>
```

#### LoginRoute

```jsx
<LoginRoute {...{
    path,  // the url for the login page - make sure it matches with `KeycloakProvider`'s `loginPath`
    redirectTo,  // the url to redirect to when you're done
    ...routeProps,  // the rest of the route props
}}>
```

##### Example
```jsx
<Router>
    <LoginRoute redirectTo="/" />
</Router>
```

#### LogoutRoute

```jsx
<LogoutRoute {...{
    path,  // the url for the logout page - make sure it matches with `KeycloakProvider`'s `logoutPath`
    redirectTo,  // the url to redirect to when you're done
    ...routeProps,  // the rest of the route props
}}>
```

##### Example
```jsx
<Router>
    <LogoutRoute redirectTo="/" />
</Router>
```

#### Protect
This is a slightly more general version of `PrivateRoute` that will only render its children
```jsx
<Protect {...{
    children,  // a function that returns the protected children
    unprotected  // an optional function that returns content to render for unauthenticated users
}} />
```
##### Example
```jsx
<Protect>() => (<div>You're only gonna see this if you're logged in !!!</div>)</Protect>
```
And if you want to display a message for unauthenticated users:
```jsx
<Protect unprotected={() => <div>Ma says not to talk to strangers !!</div>}>
    () => (<div>Oh hey friend !!</div>)
</Protect>
```

#### Other Routes
See keycloak [docs](https://github.com/keycloak/keycloak-documentation/blob/master/securing_apps/topics/oidc/javascript-adapter.adoc#createregisterurloptions).

NOTE: The path parameters here are set to their defaults and are optional. They are included here for clarity.
```jsx
<Router>
    <LoginRoute />
    <LogoutRoute />
    <RegisterUrl path='/register' /> {/* Redirects to Keycloak's register url */}
    <ManageAccountUrl path='/account' /> {/* Redirects to Keycloak's account url */}
</Router>
```

### Utilities

#### useToken

```jsx
const { 
    token, // the token string
    data // the token payload
} = useToken(
    period=null, // the interval to check the token - by default it's 1 (second), for key='refresh' it's 10(s).
    key=null // the kind of token to get. can be null, 'refresh', or 'id'
);
```

##### Example
To get your token as a string (`token`) and it's contents as an object (`data`) use this:
```jsx
import { useToken } from 'react-and-keycloak';

const App = () => {
    const { token, data } = useToken();
    return (<div>
        <p>Your token, dear: {token}</p>
        <p>anddd the data: {JSON.stringify(data)}</p>
    </div>);
}
```
If, for some reason, you want the refresh token, you can do `useToken(null, 'refresh')` or `useToken(null, 'id')` for the id token.

It will periodically check if there's a new token and will refresh when a new one is available.

If you want to 

By default, it will check refresh tokens every 10 seconds and the others every 1 second.

#### timeLeft
```jsx
// given the token payload, return the time left in seconds until expiration
const seconds = timeLeft(data);
```

To get the time left in your token, do this:

```jsx
import { useToken, timeLeft } from 'react-and-keycloak';

const App = () => {
    const { token, data } = useToken();
    // this will only update when you get a new token.
    return <div>You have {timeLeft(data)} seconds left in your token.</div>
}
```

#### useTock

```jsx
// re-render every x seconds. returns the current time
// by default, it uses 1 second
const tock = useTock(1);
```

If you want to refresh your elements on your own every second, you can do:

```jsx
import { useTock, useToken, timeLeft } from 'react-and-keycloak';

const App = () => {
    useTock(1);  // will refresh every 1 second
    const { token, data } = useToken();
    // now timeleft will update every second
    return <div>You have {timeLeft(data)} seconds left in your token.</div>
}
```
or alternatively:

```jsx
import { useTock, useToken, timeLeft } from 'react-and-keycloak';

const App = () => {
    const { token, data } = useToken();
    return <TimeLeftDisplay data={data} />
}

const TimeLeftDisplay = ({ data }) => {
    const tock = useTock(1); // now tock is only refreshing what it needs to
    return <div>You have {timeLeft(data)} seconds left in your token.</div>
}
```

