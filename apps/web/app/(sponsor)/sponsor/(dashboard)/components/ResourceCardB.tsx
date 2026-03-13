import React from 'react'
import { MoreVertical, ExternalLink, Pencil, Trash2, ArrowRight } from 'lucide-react'

interface ResourceCardBProps {
  title: string
  subtitle?: string
  status?: 'Draft' | 'Published'
  campaign?: string
  type: 'video' | 'link' | 'file' | 'sponsor' // Adjust to match your types
  actions?: React.ReactNode[]
  cornerLabel?: string
  sponsorPill?: string
  thumbnailUrl?: string
  fileSize?: number
  footerNode?: React.ReactNode
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

export function ResourceCardB({
  title,
  subtitle,
  status,
  campaign,
  type,
  actions,
  cornerLabel,
  sponsorPill,
  thumbnailUrl,
  fileSize,
  footerNode
}: ResourceCardBProps) {
  return (
    <div className="group relative flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 h-full">
      {/* Thumbnail area for files/videos or top accent for links/text */}
      {thumbnailUrl ? (
        <div className="h-32 w-full bg-gray-100 border-b border-gray-100 flex-shrink-0 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
          {cornerLabel && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-md">
              {cornerLabel}
            </div>
          )}
        </div>
      ) : (
        <div className="h-1.5 w-full flex-shrink-0 bg-[#3BA5D9]" />
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Header badges */}
        <div className="flex items-center justify-between mb-3 w-full">
          <div className="flex items-center gap-2 flex-wrap min-w-0 pr-2">
             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 shrink-0">
               {type}
             </span>
             {status && (
               <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase shrink-0 ${
                 status === 'Published' 
                   ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' 
                   : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
               }`}>
                 {status}
               </span>
             )}
          </div>
          
          {cornerLabel && !thumbnailUrl && (
            <span className="text-[10px] font-medium text-gray-400 shrink-0">
               {cornerLabel}
            </span>
          )}
        </div>

        {/* Main Content */}
        <div className="mb-4 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2" title={title}>
            {title}
          </h3>
          {(subtitle || fileSize) && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
              {subtitle && <span>{subtitle}</span>}
              {subtitle && fileSize ? ' • ' : ''}
              {fileSize && <span>{formatFileSize(fileSize)}</span>}
            </p>
          )}
        </div>

        {/* Footer info (campaigns, sponsors, or custom nodes) */}
        {(campaign || sponsorPill || footerNode) && (
          <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2">
            {footerNode}
            {sponsorPill && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-emerald-700">{sponsorPill.charAt(0)}</span>
                </span>
                <span className="text-[11px] font-medium text-gray-600 truncate">{sponsorPill}</span>
              </div>
            )}
            {campaign && (
              <div className="flex items-center gap-1.5 min-w-0">
                 <div className="shrink-0 w-1 h-3 rounded-full bg-purple-500" />
                 <span className="text-[11px] font-medium text-gray-600 truncate">{campaign}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover action overlay (if actions provided) */}
      {actions && actions.length > 0 && (
         <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-gray-200 rounded-md flex overflow-hidden">
           {actions.map((action, i) => (
             <React.Fragment key={i}>
               {action}
             </React.Fragment>
           ))}
         </div>
      )}
    </div>
  )
}
