import {render} from 'preact';
import {App} from './app';
import {applyTokens} from './theme/tokens';
import './theme/global.css';

applyTokens();
const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');
render(<App />, root);
