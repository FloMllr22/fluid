import {render} from 'preact';
import {App} from './app';
import {setLocale} from './i18n';
import {platform} from './platform';
import {applyTokens} from './theme/tokens';
import './theme/global.css';

applyTokens();
setLocale(platform.getLocale());
const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');
render(<App />, root);
