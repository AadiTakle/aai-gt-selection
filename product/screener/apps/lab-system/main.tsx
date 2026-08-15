import { createRoot } from 'react-dom/client';

import Launcher from './Launcher';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('no #root');
createRoot(root).render(<Launcher />);
