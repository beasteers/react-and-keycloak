import React from 'react';
import ReactDOM from 'react-dom';
import KeycloakProvider from 'react-and-keycloak';

import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { PrivateRoute, LoginRoute, LogoutRoute, RegisterRoute, AccountRoute, useKeycloak, useTock, timeLeft, useToken } from 'react-and-keycloak';
import './index.css';
import kcParams from './.env.json';


const Root = ({}) => {
    return (
        <div className={'app'}>
            <KeycloakProvider {...kcParams} onEvent={console.log} onTokens={console.log} initOptions={{
                // silentCheckSsoRedirectUri: true,
            }}>
                <App />
            </KeycloakProvider>
        </div>
    )
}


/* Usually this is app.js and would be imported into index.js */

function App() {
    const { initialized, keycloak } = useKeycloak();
    if (!initialized) { return <Loading /> }
    const tokenNames = ['token', 'refreshToken', 'idToken'];
    const menu = [ 
        {url: '/'}, {url: '/token'}, {url: '/refreshToken'}, {url: '/idToken'},
        {url: keycloak.authenticated ? '/logout' : '/login'},
        {name: 'register', url: keycloak.createRegisterUrl()},
        {name: 'manage account', url: keycloak.createAccountUrl()},
    ];
    return (
        <main>
            <Router>
                <Menu items={menu} />
                <Route exact path="/" render={() => <div>Hello {keycloak.token ? keycloak.tokenParsed.name : 'stranger'} !</div>} />
                <LoginRoute redirectTo="/" />
                <LogoutRoute />
                <RegisterRoute />
                <AccountRoute />
                {tokenNames.map(key => (
                  <PrivateRoute key={key} path={"/"+key} render={() => <div><TokenInfo name={key} /></div>} />
                ))}
            </Router>
        </main>
    )
}


const Loading = ({ text='Loadingggg.....' }) => {
    return <div className='loading'>{Array.prototype.map.call(text, (x, i) => (<span key={i}>{x}</span>))}</div>
}


const Menu = ({ items, selected, home='home' }) => {
    return <ul className='menu'>{items.map(d => {
        d.name = d.name || (d.url.charAt(0) == '/' ? d.url.slice(1) : d.url) || home;
        const external = d.url.startsWith('https://') || d.url.startsWith('http://');
        return <li key={d.name}>{
            d.name === selected ? <span>{d.name}</span> : 
            <Link to={external ? {pathname: d.url} : d.url} target={external ? '_blank' : ''}>{d.name}</Link>}</li>
    })}</ul>
}


const TokenInfo = ({ name='token' }) => {
    useTock(1);
    const { token, data } = useToken(null, name.slice(0,  -5));
    return (<div className='token-info'>
        <div className='counter'>Valid for: <b><span className='big-num'>{timeLeft(data)}</span> seconds</b></div>
        <pre>{token}</pre>
        <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>)
}

ReactDOM.render(<Root />, document.getElementById('root'));
