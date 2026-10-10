import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reports from './pages/Reports.jsx';
import ReportDetail from './pages/ReportDetail.jsx';
import Issues from './pages/Issues.jsx';
import IssueDetail from './pages/IssueDetail.jsx';
import SubmitReport from './pages/SubmitReport.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:id" element={<ReportDetail />} />
        <Route path="issues" element={<Issues />} />
        <Route path="issues/:id" element={<IssueDetail />} />
        <Route path="submit" element={<SubmitReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
