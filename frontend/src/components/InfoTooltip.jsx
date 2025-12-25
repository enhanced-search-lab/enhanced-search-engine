import React, { useState } from 'react';

// Interactive tooltip: shows a small '?' and a compact tooltip box on hover.
// By default nothing is visible (no 'i'); user moves cursor over the small
// hit area to reveal the '?' and the message. Kept minimal and accessible.
export default function InfoTooltip({ text }) {
    const [show, setShow] = useState(false);

    return (
        <span
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onFocus={() => setShow(true)}
            onBlur={() => setShow(false)}
            tabIndex={0}
            aria-label={text}
            style={{ display: 'inline-block', position: 'relative', marginLeft: 8 }}
        >
            {/* invisible small hit area (so label isn't cluttered). */}
            <span style={{ display: 'inline-block', width: 16, height: 16 }} aria-hidden="true" />

            {show && (
                <>
                    <span
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: -4,
                            transform: 'translateY(-100%)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            background: '#eef2ff',
                            color: '#3730a3',
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                        aria-hidden="true"
                    >
                        ?
                    </span>

                    <div
                        role="tooltip"
                        style={{
                            position: 'absolute',
                            left: 22,
                            top: -6,
                            background: '#111827',
                            color: '#ffffff',
                            padding: '6px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            maxWidth: 220,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            whiteSpace: 'normal',
                            zIndex: 60,
                        }}
                    >
                        {text}
                    </div>
                </>
            )}
        </span>
    );
}
