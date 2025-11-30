import React, { useState, useMemo } from 'react';

const ClampedText = ({ text, limit = 220, className = "", linkClassName = "" }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const { short, full, isClamped } = useMemo(() => {
        if (!text || text.length <= limit) {
            return { short: text || 'No abstract available.', full: '', isClamped: false };
        }
        return {
            short: text.slice(0, limit) + '…',
            full: text,
            isClamped: true
        };
    }, [text, limit]);

    if (!isClamped) {
        return <p className={className}>{short}</p>;
    }

    return (
        <p className={className}>
            {isExpanded ? full : short}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`font-semibold cursor-pointer ml-1 ${linkClassName}`}
            >
                {isExpanded ? 'Show less' : 'Show more'}
            </button>
        </p>
    );
};

export default ClampedText;
