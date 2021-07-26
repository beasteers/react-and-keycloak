/*

This is not imported anywhere. I didn't delete it because it has some potentially useful code.

*/

import React from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { PrivateRoute, LoginRoute, LogoutRoute, useKeycloak, useTock, timeLeft, useToken } from 'react-and-keycloak';
import './index.css';

// import fetch from 'cross-fetch';

// const makeRequester = (url) => {
//   return () => {
//     const { keycloak } = useKeycloak();
//     return ( endpoint, options ) => {
//       const { headers, ...opts } = options || {};
//       // always access token from keycloak object to ensure that it's the latest token
//       console.log(url + endpoint)
//       return fetch(url + endpoint, {headers: {
//         Authorization: 'Bearer ' + keycloak.token, 
//         ...headers}, ...opts}).then(resp => resp.json()).catch((err) => console.error(err))
//     }
//   }
// }
// const useApi = makeRequester('https://someapi.com');

// const DataView = ({ endpoint }) => {
//   const [ data, setData ] = React.useState(null);
//   const query = useApi();
//   const updateData = () => { query(endpoint).then((d) => setData(d)) };
//   React.useEffect(updateData, [])

//   return data && <div>
//     <button  onClick={updateData}>Query {endpoint}</button>
//     <div>{(new Date()).toLocaleString()}</div>
//     <pre>{JSON.stringify(data, null, 2)}</pre>
//   </div>
// }

// const PollDataView = ({ endpoint, period=5 }) => {
//   const [ data, setData ] = React.useState(null);
//   const tock = useTock(period);
//   const query = useApi();
//   console.log(tock)
//   const updateData = () => { query(endpoint).then((d) => setData(d)) };
//   React.useEffect(updateData, [tock])

//   return data && <div>
//     <div>{Date.now()}</div>
//     <pre>{JSON.stringify(data, null, 2)}</pre>
//   </div>
// }

// const TimeSince = ({ date }) => {
//   useTock();
//   return (<div>{Date.now() - date}</div>);
// }


const Loading = ({ text='Loadingggg.....' }) => {
    return <div className='loading'>{Array.prototype.map.call(text, (x, i) => (<span key={i}>{x}</span>))}</div>
}


function App() {
  const { initialized, keycloak } = useKeycloak();
  // console.log(initialized, keycloak)
  if (!initialized) {
    return <Loading />
  }

  const tokenNames = ['token', 'refreshToken', 'idToken'];

  return (
      <main>
          <Router>
              <Menu items={[
                {url: '/'},
                {url: '/token'},
                {url: '/refreshToken'},
                {url: '/idToken'},
                // {url: '/ping'},
                // {url: '/data/blahblah'},
              ]} />
              <Route exact path="/" render={() => <div>Hello {keycloak.token ? keycloak.tokenParsed.name : 'stranger'} !</div>} />
              <LoginRoute redirectTo="/token" />
              <LogoutRoute redirectTo="/" />
              {tokenNames.map(key => (
                <PrivateRoute key={key} path={"/"+key} render={() => <div>
                  <TokenInfo name={key} />
                </div>} />
              ))}
              {/* <PrivateRoute path={"/ping"} render={() => <DataView endpoint='/ping/token' />} /> */}
              {/* <PrivateRoute path={"/data/:data_id"} render={(props) => <DataView endpoint={'/data/' + props.match.params.data_id} />} /> */}
          </Router>
      </main>
  )
}


const Menu = ({ items, selected }) => {
  return <ul className='menu'>{items.map(d => {
    d.name = d.name || d.url;
    return <li key={d.name}>{d.name === selected ? <span>{d.name}</span> : <Link to={d.url}>{d.name}</Link>}</li>
  })}</ul>
}


const TokenInfo = ({ name }) => {
  useTock(1);
  const { token, data } = useToken(null, name.slice(0,  -5));
  return (<div className='token-info'>
    {/* <div>{Date.now()}</div> */}
    <div className='counter'>Valid for: <b><span className='big-num'>{timeLeft(data)}</span> seconds</b></div>
    <pre>{token}</pre>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>)
}


export default App;
