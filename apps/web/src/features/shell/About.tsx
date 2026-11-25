import { Container } from '@frame/core';
import { DataSources } from '../data/DataSources.tsx';
import styles from './ComingSoon.module.css';

/** Om tjänsten: the data table (DESIGN.md §4.5) lives here, not on the map page. */
export function About() {
  return (
    <Container size="narrow">
      <div className={styles.box}>
        <h1>Om tjänsten</h1>
        <DataSources />
      </div>
    </Container>
  );
}
