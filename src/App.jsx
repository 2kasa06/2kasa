import { Route, Routes } from 'react-router-dom'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import TeensPage from './pages/TeensPage'
import ThirtiesPage from './pages/ThirtiesPage'
import FortiesPage from './pages/FortiesPage'
import FiftiesPage from './pages/FiftiesPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teens" element={<TeensPage />} />
          <Route path="/thirties" element={<ThirtiesPage />} />
          <Route path="/forties" element={<FortiesPage />} />
          <Route path="/fifties" element={<FiftiesPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
