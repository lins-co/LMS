import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import TextField from '@mui/material/TextField';
import { _langs, _notifications } from 'src/_mock';
import { Iconify } from 'src/components/iconify';
import { Main } from './main';
import { layoutClasses } from '../classes';
import { NavMobile, NavDesktop } from './nav';
import { navData } from '../config-nav-dashboard';
import { Searchbar } from '../components/searchbar';
import { _workspaces } from '../config-nav-workspace';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';
import { AccountPopover } from '../components/account-popover';
import { LanguagePopover } from '../components/language-popover';
import { NotificationsPopover } from '../components/notifications-popover';

// ----------------------------------------------------------------------

export type DashboardLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
};

export function DashboardLayout({ sx, children, header }: DashboardLayoutProps) {
  const theme = useTheme();

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const [issueFormData, setIssueFormData] = useState({
    email: '',
    bookname: '',
  });
  const [returnFormData, setReturnFormData] = useState({
    email: '',
    bookname: '',
  });

  const handleIssueFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIssueFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReturnFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReturnFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssueBook = async () => {
    try {
      const response = await fetch('https://api.lins.co.in/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueFormData),
      });
      if (response.ok) {
        alert('Book issued successfully!');
        setIssueModalOpen(false);
        setIssueFormData({ email: '', bookname: '' });
      } else {
        alert('Failed to issue book. Please try again.');
      }
    } catch (error) {
      alert('An error occurred while issuing the book.');
      console.error(error);
    }
  };

  const handleReturnBook = async () => {
    try {
      const response = await fetch('https://api.lins.co.in/api/issue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnFormData),
      });
      if (response.ok) {
        alert('Book returned successfully!');
        setReturnModalOpen(false);
        setReturnFormData({ email: '', bookname: '' });
      } else {
        alert('Failed to return book. Please try again.');
      }
    } catch (error) {
      alert('An error occurred while returning the book.');
      console.error(error);
    }
  };

  const [navOpen, setNavOpen] = useState(false);
  const layoutQuery: Breakpoint = 'lg';

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        <HeaderSection
          layoutQuery={layoutQuery}
          slotProps={{
            container: {
              maxWidth: false,
              sx: { px: { [layoutQuery]: 5 } },
            },
          }}
          sx={header?.sx}
          slots={{
            topArea: (
              <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                This is an info Alert.
              </Alert>
            ),
            leftArea: (
              <>
                <MenuButton
                  onClick={() => setNavOpen(true)}
                  sx={{
                    ml: -1,
                    [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                  }}
                />
                <NavMobile
                  data={navData}
                  open={navOpen}
                  onClose={() => setNavOpen(false)}
                  workspaces={_workspaces}
                />
              </>
            ),
            rightArea: (
              <Box gap={1} display="flex" alignItems="center">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setIssueModalOpen(true)}
                >
                  Issue Book
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setReturnModalOpen(true)}
                >
                  Return Book
                </Button>
                <Modal open={issueModalOpen} onClose={() => setIssueModalOpen(false)}>
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
                      Issue Book
                    </Typography>
                    <TextField
                      label="Email"
                      name="email"
                      fullWidth
                      margin="normal"
                      value={issueFormData.email}
                      onChange={handleIssueFormChange}
                    />
                    <TextField
                      label="Book Name"
                      name="bookname"
                      fullWidth
                      margin="normal"
                      value={issueFormData.bookname}
                      onChange={handleIssueFormChange}
                    />
                    <Box display="flex" justifyContent="flex-end" mt={2}>
                      <Button onClick={() => setIssueModalOpen(false)} sx={{ mr: 1 }}>
                        Cancel
                      </Button>
                      <Button variant="contained" onClick={handleIssueBook}>
                        Issue
                      </Button>
                    </Box>
                  </Box>
                </Modal>

                <Modal open={returnModalOpen} onClose={() => setReturnModalOpen(false)}>
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
                      Return Book
                    </Typography>
                    <TextField
                      label="Email"
                      name="email"
                      fullWidth
                      margin="normal"
                      value={returnFormData.email}
                      onChange={handleReturnFormChange}
                    />
                    <TextField
                      label="Book Name"
                      name="bookname"
                      fullWidth
                      margin="normal"
                      value={returnFormData.bookname}
                      onChange={handleReturnFormChange}
                    />
                    <Box display="flex" justifyContent="flex-end" mt={2}>
                      <Button onClick={() => setReturnModalOpen(false)} sx={{ mr: 1 }}>
                        Cancel
                      </Button>
                      <Button variant="contained" onClick={handleReturnBook}>
                        Return
                      </Button>
                    </Box>
                  </Box>
                </Modal>
                <Searchbar />

                <NotificationsPopover data={_notifications} />
                <AccountPopover
                  data={[
                    {
                      label: 'Home',
                      href: '/',
                      icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
                    },
                    {
                      label: 'Profile',
                      href: '#',
                      icon: <Iconify width={22} icon="solar:shield-keyhole-bold-duotone" />,
                    },
                    {
                      label: 'Settings',
                      href: '#',
                      icon: <Iconify width={22} icon="solar:settings-bold-duotone" />,
                    },
                  ]}
                />
              </Box>
            ),
          }}
        />
      }
      /** **************************************
       * Sidebar
       *************************************** */
      sidebarSection={
        <NavDesktop data={navData} layoutQuery={layoutQuery} workspaces={_workspaces} />
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{
        '--layout-nav-vertical-width': '300px',
        '--layout-dashboard-content-pt': theme.spacing(1),
        '--layout-dashboard-content-pb': theme.spacing(8),
        '--layout-dashboard-content-px': theme.spacing(5),
      }}
      sx={{
        [`& .${layoutClasses.hasSidebar}`]: {
          [theme.breakpoints.up(layoutQuery)]: {
            pl: 'var(--layout-nav-vertical-width)',
          },
        },
        ...sx,
      }}
    >
      <Main>{children}</Main>
    </LayoutSection>
  );
}
