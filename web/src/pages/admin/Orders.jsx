import { useParams } from 'react-router-dom'
import OrderListPage from '../../components/admin/OrderListPage.jsx'

export default function Orders() {
  const { companyId } = useParams()
  return <OrderListPage companyId={companyId} mode="orders" />
}
