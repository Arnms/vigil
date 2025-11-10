import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import Dashboard from './pages/Dashboard'
import EndpointList from './pages/Endpoints/EndpointList'
import EndpointForm from './pages/Endpoints/EndpointForm'
import EndpointDetail from './pages/Endpoints/EndpointDetail'
import Incidents from './pages/Incidents'
import Statistics from './pages/Statistics'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/endpoints" element={<EndpointList />} />
          <Route path="/endpoints/new" element={<EndpointForm />} />
          <Route path="/endpoints/:id" element={<EndpointDetail />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
