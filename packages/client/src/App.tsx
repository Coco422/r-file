import { Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import TextShare from './pages/TextShare';
import TextView from './pages/TextView';
import P2PRoom from './pages/P2PRoom';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/text" element={<TextShare />} />
        <Route path="/text/:code" element={<TextView />} />
        <Route path="/p2p" element={<P2PRoom />} />
        <Route path="/p2p/:roomCode" element={<P2PRoom />} />
        <Route path="/:code" element={<TextView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;
