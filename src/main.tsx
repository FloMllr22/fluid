import {render} from 'preact';
import {App} from './app';
import {localeFor, setLocale} from './i18n';
import {platform} from './platform';
import {loadSettings} from './state/settings';
import {applyTokens} from './theme/tokens';
import './theme/global.css';

applyTokens();
// The settings first, so that the first frame is already in the chosen language (and look,
// which App applies as it is first drawn).
const loaded = loadSettings();
setLocale(localeFor(loaded.settings.language, platform.getLocale()));
const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');
render(<App loaded={loaded} />, root);
