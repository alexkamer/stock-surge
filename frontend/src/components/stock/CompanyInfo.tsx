import React, { useState } from "react";
import { ExternalLink, MapPin, Users, Building2 } from "lucide-react";
import type { CompanyInfo as CompanyInfoType } from "../../api/endpoints/stocks";

interface CompanyInfoProps {
  info: CompanyInfoType;
}

export const CompanyInfo: React.FC<CompanyInfoProps> = ({ info }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const description = info.description || "No description available";
  const shouldTruncate = description.length > 500;
  const displayDescription = shouldTruncate && !showFullDescription
    ? description.slice(0, 500) + "..."
    : description;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Company Information</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-2xl font-bold mb-2">{info.name}</h4>
          <p className="text-text-secondary">{info.symbol}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {info.sector && (
            <div className="flex items-start gap-2">
              <Building2 size={18} className="text-text-secondary mt-1" />
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">
                  Sector
                </p>
                <p className="text-sm font-medium">{info.sector}</p>
              </div>
            </div>
          )}

          {info.industry && (
            <div className="flex items-start gap-2">
              <Building2 size={18} className="text-text-secondary mt-1" />
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">
                  Industry
                </p>
                <p className="text-sm font-medium">{info.industry}</p>
              </div>
            </div>
          )}

          {info.city && info.country && (
            <div className="flex items-start gap-2">
              <MapPin size={18} className="text-text-secondary mt-1" />
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">
                  Location
                </p>
                <p className="text-sm font-medium">
                  {info.city}, {info.country}
                </p>
              </div>
            </div>
          )}

          {info.employees && (
            <div className="flex items-start gap-2">
              <Users size={18} className="text-text-secondary mt-1" />
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">
                  Employees
                </p>
                <p className="text-sm font-medium">
                  {info.employees.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {info.website && (
          <a
            href={info.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-positive hover:underline text-sm"
          >
            <ExternalLink size={16} />
            Visit Website
          </a>
        )}

        <div className="pt-4 border-t border-border">
          <h5 className="text-sm font-semibold mb-2 text-text-secondary uppercase tracking-wider">
            About
          </h5>
          <p className="text-sm text-text-secondary leading-relaxed">
            {displayDescription}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="mt-2 text-sm text-positive hover:underline"
            >
              {showFullDescription ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
