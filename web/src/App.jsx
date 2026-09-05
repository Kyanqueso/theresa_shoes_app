import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import CompanyLayout from './components/CompanyLayout.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import Home from './pages/guest/Home.jsx'
import Collection from './pages/guest/Collection.jsx'
import Contact from './pages/guest/Contact.jsx'
import AboutUs from './pages/guest/AboutUs.jsx'
import Login from './pages/Login.jsx'
import ManageCollection from './pages/ManageCollection.jsx'
import ShoeDetails from './pages/ShoeDetails.jsx'
import Forbidden from './pages/Forbidden.jsx'
import PairDevice from './pages/PairDevice.jsx'
import NotFound from './pages/NotFound.jsx'
import Companies from './pages/admin/Companies.jsx'
import Orders from './pages/admin/Orders.jsx'
import Payments from './pages/admin/Payments.jsx'
import CompleteOrders from './pages/admin/CompleteOrders.jsx'
import Analytics from './pages/admin/Analytics.jsx'
import Devices from './pages/admin/Devices.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="collection" element={<Navigate to="/collection/women" replace />} />
          <Route path="collection/:tag" element={<Collection />} />
          <Route element={<RequireAdmin />}>
            <Route path="collection/:tag/manage" element={<ManageCollection />} />
          </Route>
          <Route path="contact" element={<Contact />} />
          <Route path="about" element={<AboutUs />} />
          <Route path="login" element={<Login />} />
        </Route>

        <Route path="collection/:tag/shoe/:shoeId" element={<ShoeDetails />} />

        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<Navigate to="/admin/companies" replace />} />
            <Route path="admin/companies" element={<Companies />} />
            <Route path="admin/analytics" element={<Analytics />} />
            <Route path="admin/devices" element={<Devices />} />
          </Route>

          <Route element={<CompanyLayout />}>
            <Route path="admin/companies/:companyId/orders" element={<Orders />} />
            <Route path="admin/companies/:companyId/payments" element={<Payments />} />
            <Route path="admin/companies/:companyId/complete-orders" element={<CompleteOrders />} />
          </Route>
        </Route>

        <Route path="pair" element={<PairDevice />} />
        <Route path="403" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
