import { useState, memo, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Link,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import { Iconify } from 'src/components/iconify';
import { useTheme } from '@mui/material/styles';
import { CONFIG } from 'src/config-global';

type Message = {
  author: 'user' | 'bot';
  text: string;
  draft?: {
    subject: string;
    text: string;
    recipients: string[];
  };
  previewUrl?: string;
  downloadUrl?: {
    url: string;
    filename: string;
  };
};

const JsonTable = memo(({ data }: { data: any[] }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <Typography variant="body2">No data to display.</Typography>;
  }
  const headers = Object.keys(data[0]);
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {headers.map((header) => (
                <TableCell key={header}>{String(row[header])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

const ChatMessage = memo(
  ({ message, onSendEmail, loading }: { message: Message; onSendEmail: (draft: Message['draft']) => void; loading: boolean; }) => {
    const theme = useTheme();
    const isUser = message.author === 'user';
    const isJsonString = (str: string) => {
      try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null;
      } catch (e) {
        return false;
      }
    };

    const renderContent = () => {
      if (isJsonString(message.text)) {
        const data = JSON.parse(message.text);
        return <JsonTable data={Array.isArray(data) ? data : [data]} />;
      }
      return <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{message.text}</pre>;
    };

    return (
      <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && <Avatar sx={{ bgcolor: 'primary.main' }}><Iconify icon="fluent:bot-24-filled" /></Avatar>}
        <Box>
          <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isUser ? theme.palette.primary.lighter : theme.palette.grey[200], maxWidth: '500px' }}>
            {renderContent()}
            {message.draft && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>Drafted Email:</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.draft.text}</pre>
                </Paper>
                <Button variant="contained" onClick={() => onSendEmail(message.draft)} sx={{ mt: 1 }} disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'Confirm & Send'}
                </Button>
              </Box>
            )}
            {message.previewUrl && <Link href={message.previewUrl} target="_blank" rel="noopener noreferrer">View Email Preview</Link>}
            {message.downloadUrl && <Link href={message.downloadUrl.url} download={message.downloadUrl.filename}>Download Report</Link>}
          </Box>
        </Box>
        {isUser && <Avatar sx={{ bgcolor: 'secondary.main' }}>U</Avatar>}
      </Stack>
    );
  }
);

export const Chat = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  const handleSend = async () => {
    if (!query.trim() || !token) return;

    const userMessage: Message = { author: 'user', text: query };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setQuery('');

    try {
      let endpoint = '/api/ai/generate-sql';
      const lowerCaseQuery = query.toLowerCase();

      if (lowerCaseQuery.includes('mail') || lowerCaseQuery.includes('remind')) endpoint = '/api/ai/draft-email';
      else if (lowerCaseQuery.includes('report') || lowerCaseQuery.includes('excel')) endpoint = '/api/ai/generate-report';
      else if (lowerCaseQuery.includes('suggest') || lowerCaseQuery.includes('recommend') || lowerCaseQuery.includes('popular') || lowerCaseQuery.includes('restock') || lowerCaseQuery.includes('history')) endpoint = '/api/ai/smart-suggestion';

      const response = await fetch(`${CONFIG.site.serverUrl}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ query, prompt: query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'An API error occurred.');
      }

      if (endpoint === '/api/ai/generate-report') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setMessages((prev) => [...prev, { author: 'bot', text: 'Your report is ready.', downloadUrl: { url, filename: 'report.xlsx' } }]);
      } else {
        const data = await response.json();
        let botMessage: Message = { author: 'bot', text: '' };
        if (data.draft) {
          botMessage.text = `I have drafted an email. Send to ${data.recipients.length} recipients?`;
          botMessage.draft = { subject: 'Overdue Book Reminder', text: data.draft, recipients: data.recipients };
        } else if (data.suggestion) {
          botMessage.text = data.suggestion;
        } else {
          botMessage.text = JSON.stringify(data, null, 2);
        }
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, { author: 'bot', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (draft: Message['draft']) => {
    if (!draft || !token) return;
    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.site.serverUrl}/api/ai/send-email`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { author: 'bot', text: 'Emails sent successfully!', previewUrl: data.previewUrl }]);
      } else {
        throw new Error(data.error || 'Failed to send email.');
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, { author: 'bot', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Alert severity="warning">Please <a href="/sign-in">sign in</a> to use the AI Assistant.</Alert>;
  }

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
      <Typography variant="h6" gutterBottom>AI Assistant</Typography>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 1 }}>
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} onSendEmail={handleSendEmail} loading={loading} />
        ))}
        {loading && (
          <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'flex-start' }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}><Iconify icon="fluent:bot-24-filled" /></Avatar>
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.200' }}><CircularProgress size={20} /></Box>
          </Stack>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
          placeholder={`Ask a question, ${user.name}...`}
          disabled={loading}
          variant="outlined"
        />
        <Button variant="contained" onClick={handleSend} disabled={loading} sx={{ ml: 1 }}><Iconify icon="eva:paper-plane-fill" /></Button>
      </Box>
    </Paper>
  );
};
