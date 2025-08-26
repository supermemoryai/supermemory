import { colors } from '@repo/ui/memory-graph/constants';
import {
  GoogleDocs,
  MicrosoftWord,
  NotionDoc,
  GoogleDrive,
  GoogleSheets,
  GoogleSlides,
  PDF,
  OneDrive,
  MicrosoftOneNote,
  MicrosoftPowerpoint,
  MicrosoftExcel,
} from '@ui/assets/icons';
import { FileText } from 'lucide-react';

export const getDocumentIcon = (type: string, className: string) => {
  const iconProps = {
    className,
    style: { color: colors.text.muted },
  };

  switch (type) {
    case 'google_doc':
      return <GoogleDocs {...iconProps} />;
    case 'google_sheet':
      return <GoogleSheets {...iconProps} />;
    case 'google_slide':
      return <GoogleSlides {...iconProps} />;
    case 'google_drive':
      return <GoogleDrive {...iconProps} />;
    case 'notion':
    case 'notion_doc':
      return <NotionDoc {...iconProps} />;
    case 'word':
    case 'microsoft_word':
      return <MicrosoftWord {...iconProps} />;
    case 'excel':
    case 'microsoft_excel':
      return <MicrosoftExcel {...iconProps} />;
    case 'powerpoint':
    case 'microsoft_powerpoint':
      return <MicrosoftPowerpoint {...iconProps} />;
    case 'onenote':
    case 'microsoft_onenote':
      return <MicrosoftOneNote {...iconProps} />;
    case 'onedrive':
      return <OneDrive {...iconProps} />;
    case 'pdf':
      return <PDF {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};
