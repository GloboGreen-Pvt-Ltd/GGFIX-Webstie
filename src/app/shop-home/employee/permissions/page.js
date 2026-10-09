'use client';

/**
 * /shop-home/employee/permissions — "Permission", as in the Partner app: a
 * month switcher, the month's total permissions, and one row per employee
 * with Present / Late / Perm / Leave for that month. A row opens the
 * employee's Attendance page (calendar + daily records).
 *
 * Counts per employee: GET {TICKET_BASE}/technicians/{id}/attendance?month&year
 * (AttendanceSummaryResponse — presentDays, lateHours, permissionCount,
 * leaveDays) via fetchTechnicianAttendance(); roster via fetchTechnicians().
 */

import { Hand } from 'lucide-react';

import EmployeeMonthList from '@/components/shop-dashboard/EmployeeMonthList';
import { fetchTechnicianAttendance } from '@/lib/shopDashboard';

const lateValue = (s) => String(s.lateHours ?? 0).replace(/\s*hrs?$/i, '') || '0';

const COLUMNS = [
  { key: 'present', label: 'Present', value: (s) => Number(s.presentDays) || 0 },
  { key: 'late', label: 'Late', value: lateValue },
  { key: 'perm', label: 'Perm', value: (s) => Number(s.permissionCount) || 0, accent: true },
  { key: 'leave', label: 'Leave', value: (s) => Number(s.leaveDays) || 0 },
];

export default function PermissionsPage() {
  return (
    <EmployeeMonthList
      title="Permission"
      icon={Hand}
      totalLabel="Total Permission"
      columns={COLUMNS}
      loadStats={(t, month, year) => fetchTechnicianAttendance(t.id, month, year)}
      totalOf={(s) => s.permissionCount}
      hrefFor={(t) => `/shop-home/employee/attendance/view/?id=${encodeURIComponent(t.id)}`}
    />
  );
}
