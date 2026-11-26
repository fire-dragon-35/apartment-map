import { DataSources } from '../data/DataSources.tsx';
import { ContentPage } from './ContentPage.tsx';

/** Om tjänsten: the data table (DESIGN.md §4.5) lives here, not on the map page. */
export function About() {
  return <ContentPage title="Om tjänsten"><DataSources /></ContentPage>;
}
