import { Suspense } from 'react';
import ServiceReportClient from './ServiceReportClient';

// Static export: useSearchParams() (used to switch into single-technician
// mode via ?employeeId=&name=, e.g. from Employee Management's Quick Access)
// needs a Suspense boundary — see model-compatibility/page.js for the same
// pattern already established in this app.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ServiceReportClient />
    </Suspense>
  );
}
