import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminLiveMonitor.css';

const AdminLiveMonitor = () => {
    const [submissions, setSubmissions] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, error
    const { user } = useAuth();
    const eventSourceRef = useRef(null);

    useEffect(() => {
        // Wait for user to be loaded (admin check)
        if (!user) {
            console.log('Waiting for user authentication...');
            setConnectionStatus('error');
            return;
        }

        // SSE URL - cookies are sent automatically by browser
        const sseUrl = `/api/r-submission`;

        console.log('Connecting to SSE (auth via cookies)');

        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // EventSource sends cookies automatically
        const eventSource = new EventSource(sseUrl, {
            withCredentials: true
        });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('SSE Connected');
            setConnectionStatus('connected');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('SSE Message:', data);

                if (data.type === 'connected') {
                    return;
                }

                setSubmissions(prev => {
                    // Keep only last 50 submissions
                    const newSubmissions = [data, ...prev];
                    if (newSubmissions.length > 50) {
                        return newSubmissions.slice(0, 50);
                    }
                    return newSubmissions;
                });
            } catch (err) {
                console.error('Error parsing SSE message:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Error:', err);
            setConnectionStatus('error');
            // EventSource automatically reconnects, but we can show status
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [user]);

    return (
        <div className="admin-live-monitor">
            <div className="monitor-header">
                <h2>Live Flag Submissions</h2>
                <div className={`status-badge status-${connectionStatus}`}>
                    {connectionStatus === 'connected' ? '● LIVE' : '○ ' + connectionStatus.toUpperCase()}
                </div>
            </div>

            <div className="table-container">
                {connectionStatus === 'error' && (
                    <div style={{padding: '10px', color: '#e74c3c', marginBottom: '10px'}}>
                        Connection failed. Check console for details.
                    </div>
                )}
                <table className="submissions-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Email</th>
                            <th>Challenge</th>
                            <th>Flag</th>
                            <th>Points</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.length === 0 ? (
                            <tr className="empty-row">
                                <td colSpan="7">Waiting for submissions...</td>
                            </tr>
                        ) : (
                            submissions.map((sub, index) => {
                                const isFailed = sub.type === 'failed_attempt' || sub.status === 'incorrect';
                                return (
                                    <tr key={index} className={`submission-row fade-in ${isFailed ? 'failed-attempt' : ''}`} style={isFailed ? {color: '#e74c3c'} : {color: '#2ecc71'}}>
                                        <td style={{color: '#ecf0f1'}}>{new Date(sub.submittedAt).toLocaleTimeString()}</td>
                                        <td className="font-bold" style={{color: '#3498db'}}>{sub.user}</td>
                                        <td style={{color: '#bdc3c7'}}>{sub.email}</td>
                                        <td className="text-highlight" style={{color: '#e67e22'}}>{sub.challenge}</td>
                                        <td style={{color: '#f39c12', fontFamily: 'monospace', fontSize: '0.9em'}}>{sub.submittedFlag || 'N/A'}</td>
                                        <td className={isFailed ? 'text-error' : 'text-success'} style={{fontWeight: 'bold'}}>
                                            {isFailed ? '✗ ' : '✓ '}{sub.points}
                                        </td>
                                        <td style={{color: '#95a5a6'}}>{sub.ip}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminLiveMonitor;
