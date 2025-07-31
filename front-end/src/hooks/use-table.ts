import { useState, useCallback } from 'react';

// ----------------------------------------------------------------------

export type UseTableProps = {
  dense?: boolean;
  page?: number;
  rowsPerPage?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  defaultDense?: boolean;
  defaultPage?: number;
  defaultRowsPerPage?: number;
  defaultOrderBy?: string;
  defaultOrder?: 'asc' | 'desc';
  defaultSelected?: string[];
};

export type UseTableReturn = {
  dense: boolean;
  order: 'asc' | 'desc';
  page: number;
  orderBy: string;
  rowsPerPage: number;
  //
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  //
  onSort: (id: string) => void;
  onChangePage: (event: unknown, newPage: number) => void;
  onChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeDense: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectRow: (id: string) => void;
  onSelectAllRows: (checked: boolean, newSelecteds: string[]) => void;
  onResetPage: () => void;
  //
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setDense: React.Dispatch<React.SetStateAction<boolean>>;
  setOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  setOrderBy: React.Dispatch<React.SetStateAction<string>>;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
  //
  rowsPerPageOptions: number[];
};

export function useTable(props?: UseTableProps) {
  const [dense, setDense] = useState(props?.defaultDense || false);

  const [page, setPage] = useState(props?.defaultPage || 0);

  const [orderBy, setOrderBy] = useState(props?.defaultOrderBy || 'name');

  const [rowsPerPage, setRowsPerPage] = useState(props?.defaultRowsPerPage || 5);

  const [order, setOrder] = useState<'asc' | 'desc'>(props?.defaultOrder || 'asc');

  const [selected, setSelected] = useState<string[]>(props?.defaultSelected || []);

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      if (id !== '') {
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(id);
      }
    },
    [order, orderBy]
  );

  const onSelectRow = useCallback(
    (id: string) => {
      const selectedIndex = selected.indexOf(id);

      let newSelected: string[] = [];

      if (selectedIndex === -1) {
        newSelected = newSelected.concat(selected, id);
      } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selected.slice(1));
      } else if (selectedIndex === selected.length - 1) {
        newSelected = newSelected.concat(selected.slice(0, -1));
      } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(
          selected.slice(0, selectedIndex),
          selected.slice(selectedIndex + 1)
        );
      }
      setSelected(newSelected);
    },
    [selected]
  );

  const onSelectAllRows = useCallback(
    (checked: boolean, newSelecteds: string[]) => {
      if (checked) {
        setSelected(newSelecteds);
        return;
      }
      setSelected([]);
    },
    [setSelected]
  );

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPage(0);
      setRowsPerPage(parseInt(event.target.value, 10));
    },
    [setPage, setRowsPerPage]
  );

  const onChangeDense = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDense(event.target.checked);
  }, []);

  const onResetPage = useCallback(() => {
    setPage(0);
  }, []);

  return {
    dense,
    order,
    page,
    orderBy,
    rowsPerPage,
    //
    selected,
    setSelected,
    //
    onSort,
    onSelectRow,
    onSelectAllRows,
    onChangePage,
    onChangeRowsPerPage,
    onChangeDense,
    onResetPage,
    //
    setPage,
    setDense,
    setOrder,
    setOrderBy,
    setRowsPerPage,
    //
    rowsPerPageOptions: [5, 10, 25],
  };
}
