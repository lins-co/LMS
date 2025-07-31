import { memo, useState } from 'react';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Link,
  Paper,
  Stack,
  Table,
  Button,
  Avatar,
  TableRow,
  TextField,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
  CircularProgress,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

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
  ({
    message,
    onSendEmail,
    loading,
  }: {
    message: Message;
    onSendEmail: (draft: Message['draft']) => void;
    loading: boolean;
  }) => {
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
      return (
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
          {message.text}
        </pre>
      );
    };

    return (
      <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && (
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <Iconify icon="fluent:bot-24-filled" />
          </Avatar>
        )}
        <Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: isUser ? theme.palette.primary.lighter : theme.palette.grey[200],
              maxWidth: '500px',
            }}
          >
            {renderContent()}
            {message.draft && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Drafted Email:
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.draft.text}</pre>
                </Paper>
                <Button
                  variant="contained"
                  onClick={() => onSendEmail(message.draft)}
                  sx={{ mt: 1 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Confirm & Send'}
                </Button>
              </Box>
            )}
            {message.previewUrl && (
              <Link href={message.previewUrl} target="_blank" rel="noopener noreferrer">
                View Email Preview
              </Link>
            )}
            {message.downloadUrl && (
              <Link href={message.downloadUrl.url} download={message.downloadUrl.filename}>
                Download Report
              </Link>
            )}
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

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMessage: Message = { author: 'user', text: query };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setQuery('');

    try {
      let response;
      const lowerCaseQuery = query.toLowerCase();

      if (lowerCaseQuery.includes('mail') || lowerCaseQuery.includes('remind')) {
        response = await fetch('http://localhost:3008/api/ai/draft-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: query }),
        });
        const data = await response.json();
        if (response.ok) {
          const botMessage: Message = {
            author: 'bot',
            text: `I have drafted the following email. Do you want to send it to ${data.recipients.length} recipients?`,
            draft: {
              subject: 'Overdue Book Reminder',
              text: data.draft,
              recipients: data.recipients,
            },
          };
          setMessages((prev) => [...prev, botMessage]);
        } else {
          throw new Error(data.error || 'Failed to draft email.');
        }
      } else if (lowerCaseQuery.includes('report') || lowerCaseQuery.includes('excel')) {
        response = await fetch('http://localhost:3008/api/ai/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const botMessage: Message = {
            author: 'bot',
            text: 'Your report is ready for download.',
            downloadUrl: {
              url,
              filename: 'report.xlsx',
            },
          };
          setMessages((prev) => [...prev, botMessage]);
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate report.');
        }
      } else if (
        lowerCaseQuery.includes('suggest') ||
        lowerCaseQuery.includes('recommend') ||
        lowerCaseQuery.includes('popular') ||
        lowerCaseQuery.includes('restock')
      ) {
        response = await fetch('http://localhost:3008/api/ai/smart-suggestion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = await response.json();
        if (response.ok) {
          const botMessage: Message = { author: 'bot', text: data.suggestion };
          setMessages((prev) => [...prev, botMessage]);
        } else {
          throw new Error(data.error || 'Failed to get suggestion.');
        }
      } else {
        response = await fetch('http://localhost:3008/api/ai/generate-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = await response.json();
        if (response.ok) {
          const botMessage: Message = { author: 'bot', text: JSON.stringify(data, null, 2) };
          setMessages((prev) => [...prev, botMessage]);
        } else {
          throw new Error(data.error || 'Failed to generate SQL.');
        }
      }
    } catch (error: any) {
      const errorMessage: Message = { author: 'bot', text: `Error: ${error.message}` };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (draft: Message['draft']) => {
    if (!draft) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3008/api/ai/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (response.ok) {
        const botMessage: Message = {
          author: 'bot',
          text: `Emails sent successfully! You can preview it here:`,
          previewUrl: data.previewUrl,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to send email.');
      }
    } catch (error: any) {
      const errorMessage: Message = { author: 'bot', text: `Error: ${error.message}` };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
      <Typography variant="h6" gutterBottom>
        AI Assistant
      </Typography>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 1 }}>
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} onSendEmail={handleSendEmail} loading={loading} />
        ))}
         {loading && (
          <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'flex-start' }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <Iconify icon="fluent:bot-24-filled" />
            </Avatar>
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.200', maxWidth: '500px' }}>
              <CircularProgress size={20} />
            </Box>
          </Stack>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
          placeholder="Ask a question or give a command..."
          disabled={loading}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading}
          sx={{ ml: 1, borderRadius: '50%', minWidth: 'auto', width: 48, height: 48 }}
        >
          <Iconify icon="eva:paper-plane-fill" />
        </Button>
      </Box>
    </Paper>
  );
};