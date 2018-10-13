import React from 'react';
import PropTypes from 'prop-types';

class TabView extends React.Component {
  constructor(props) {
    super(props);
    this.state = { activeTab: null };
    if (props.tabTitles.length > 0) {
      this.state.activeTab = 0;
    }
  }

  tabClick(index) {
    this.setState({ activeTab: index });
  }

  computeUrl(tabName) {
    let url = tabName.toLowerCase();
    url = url.replace(" ", "_");
    return url;
  }

  render() {
    let tabContents = null;
    if (
      this.state.activeTab !== null &&
      this.props.tabContents &&
      this.props.tabContents[this.state.activeTab]
    ) {
      tabContents = this.props.tabContents[this.state.activeTab];
    }

    return (
      <React.Fragment>
        <div className="tabs">
          <ul>
            {this.props.tabTitles.map((tab, index) => (
              <li
                key={tab}
                className={index === this.state.activeTab ? 'is-active' : ''}
                onClick={this.tabClick.bind(this, index)}
              >
                <a href={`#/${this.computeUrl(tab)}`}>{tab}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="container is-fluid">
          {tabContents}
        </div>
      </React.Fragment>
    );
  }
}

TabView.defaultProps = {
  tabTitles: [],
  tabContents: null,
}

TabView.propTypes = {
  tabTitles: PropTypes.array,
  tabContents: PropTypes.node,
}

export default TabView;
