import { Layout } from 'antd';
import React from 'react';
import FilterPanel from './components/FilterPanel';
import MyGridLayout from './components/GridLayout';
import { VersionDisplay } from './components/VersionDisplay';
import { DataProvider, useData } from './services/store';

export const DARK_BACK_COLOR = '#000'//'#070f27'

const { Header, Content, Footer } = Layout;

export const App: React.FC = () => {

  return (
    <DataProvider>
    <Layout>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          height: 'auto',
          paddingTop: '7px',
          paddingBottom: '7px',
          background: DARK_BACK_COLOR
        }}
      >
        <FilterPanel></FilterPanel>
        <VersionDisplay></VersionDisplay>
      </Header>
      <Content style={{ padding: '0 48px', background: DARK_BACK_COLOR, }}>
        <div
          style={{
            // padding: 24,
            minHeight: 380,
            background: DARK_BACK_COLOR,
            // borderRadius: borderRadiusLG,
          }}
        >
          {/* <DebugDiv /> */}
          <MyGridLayout/>
        </div>
      </Content>
      {/* <Footer style={{ textAlign: 'center' }}>
        Ant Design ©{new Date().getFullYear()} Created by Ant UED
      </Footer> */}
    </Layout>
    </DataProvider>
  );
};

function DebugDiv() {
  const { sharedData, sharedFilter } = useData();
  const pStyle = {
      color: '#fff'
  }
  return (
    <div>
      <p style={pStyle}>Data from child: {JSON.stringify(sharedData)}</p>
      <p style={pStyle}>Filter from child: {JSON.stringify(sharedFilter)}</p>
    </div>
  );
}
