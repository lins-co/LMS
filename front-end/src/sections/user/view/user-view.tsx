import { useState, useEffect, useCallback } from 'react';
import Modal from '@mui/material/Modal';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { _users } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchUsers } from 'src/services/api';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { UserTableRow } from '../user-table-row';
import { UserTableHead } from '../user-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../user-table-toolbar';
import { emptyRows, applyFilter, getComparator } from '../utils';

import type { UserProps } from '../user-table-row';

// Interface for form data
interface FormData {
  name: string;
  email: string;
  subject: string;
}

// Fetch Users Function
const _getUsers = async (): Promise<UserProps[]> => {
  const users = await fetchUsers();
  return users;
};

// UserView Component
export function UserView() {
  const table = useTable();
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
  });
  const [filterName, setFilterName] = useState('');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [dataFiltered, setDataFiltered] = useState<UserProps[]>([]);

  // Fetch users on mount
  useEffect(() => {
    const fetchUserIds = async () => {
      try {
        const users = await _getUsers();
        setUserIds(users.map((user) => user.id));
        setDataFiltered(users); // Initial population of filtered data
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUserIds();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = async () => {
    try {
      const response = await fetch('https://api.lins.co.in/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert('Student added successfully!');
        setPopupOpen(false);
        setFormData({ name: '', email: '', subject: '' });
      } else {
        alert('Failed to add the Student. Please try again.');
      }
    } catch (error) {
      alert('An error occurred while adding the Student.');
      console.error(error);
    }
  };

  const notFound = !dataFiltered.length && !!filterName;

  // Apply filter on change
  useEffect(() => {
    const filtered = applyFilter({
      inputData: _users,
      comparator: getComparator(table.order, table.orderBy),
      filterName,
    });
    setDataFiltered(filtered);
  }, [filterName, table.order, table.orderBy]);

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          Students
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          onClick={() => setPopupOpen(true)}
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          New Student
        </Button>
      </Box>

      <Modal open={isPopupOpen} onClose={() => setPopupOpen(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            width: 400,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" mb={2}>
            Add A New Student
          </Typography>
          <TextField
            label="Student Name"
            name="name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={handleFormChange}
          />
          <TextField
            label="E-Mail"
            name="email"
            fullWidth
            margin="normal"
            value={formData.email}
            onChange={handleFormChange}
          />
          <TextField
            label="Major"
            name="subject"
            fullWidth
            margin="normal"
            value={formData.subject}
            onChange={handleFormChange}
          />
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button onClick={() => setPopupOpen(false)} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleFormSubmit}>
              Submit
            </Button>
          </Box>
        </Box>
      </Modal>

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <UserTableHead
                order={table.order}
                orderBy={table.orderBy}
                rowCount={userIds.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(checked, userIds)
                }
                headLabel={[
                  { id: 'name', label: 'Name' },
                  { id: 'email', label: 'Email Address' },
                  { id: 'subject', label: 'Majors' },
                  { id: 'issued', label: 'Book-Issued', align: 'center' },
                  { id: 'fine', label: 'Fine Status' },
                  { id: '' },
                ]}
              />
              <TableBody>
                {dataFiltered
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((row) => (
                    <UserTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                    />
                  ))}

                <TableEmptyRows
                  height={68}
                  emptyRows={emptyRows(
                    table.page,
                    table.rowsPerPage,
                    userIds.length
                  )}
                />

                {notFound && <TableNoData searchQuery={filterName} />}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={table.page}
          count={userIds.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}

// useTable Hook
export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('name');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, newSelecteds: string[]) => {
    if (checked) {
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  }, []);

  const onSelectRow = useCallback(
    (inputValue: string) => {
      const newSelected = selected.includes(inputValue)
        ? selected.filter((value) => value !== inputValue)
        : [...selected, inputValue];

      setSelected(newSelected);
    },
    [selected]
  );

  const onResetPage = useCallback(() => {
    setPage(0);
  }, []);

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      onResetPage();
    },
    [onResetPage]
  );

  return {
    page,
    order,
    onSort,
    orderBy,
    selected,
    rowsPerPage,
    onSelectRow,
    onResetPage,
    setSelected,
    onChangePage,
    onSelectAllRows,
    onChangeRowsPerPage,
  };
}
